using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Conflux.Application.Features.Identity;

public sealed record DeleteAccountCommand(
    UserAccountDeleteReason Reason,
    string? ExtraMessage
) : ICommand<Result>;

public sealed class DeleteAccountHandler(
    ICurrentUserService currentUserService,
    IUserRepository userRepository,
    IUserAccountDeletionReadRepository accountDeletionReadRepository,
    IUserAccountDeletionWriteRepository accountDeletionWriteRepository,
    IUnitOfWork unitOfWork,
    ILogger<DeleteAccountHandler> logger,
    ISessionService sessionService,
    IPendingDeleteAccountCacheProvider pendingDeleteAccountCacheProvider
) : ICommandHandler<DeleteAccountCommand, Result> {
    public async ValueTask<Result> Handle(DeleteAccountCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        // prevent already deleted
        bool isDeleted = (await userRepository
            .AsQueryable()
            .Where(u => u.Id == userId)
            .Select(u => u.DeletedAt)
            .FirstOrDefaultAsync(cancellationToken)).HasValue;

        if (isDeleted) {
            return Errors.NoUserFoundFromId();
        }
        
        // if user is already having a pending request, return success
        bool hasPendingRequest = await accountDeletionReadRepository
            .AsQueryable()
            .Where(r => r.UserId == userId && r.Status == UserAccountDeleteStatus.Pending)
            .AnyAsync(cancellationToken);

        if (hasPendingRequest) {
            return Errors.PendingAccountDeletionExists();
        }

        UserAccountDeletion request = new() {
            UserId = userId,
            Reason = command.Reason,
            ExtraMessage = command.ExtraMessage,
            Status = UserAccountDeleteStatus.Pending,
        };

        accountDeletionWriteRepository.Add(request);

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (OperationCanceledException) {
            throw;
        } catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation } postgresException) {
            if (postgresException.ConstraintName == "FK_UserAccountDeletions_AspNetUsers_UserId") {
                return Errors.NoUserFoundFromId();
            }

            logger.LogError(e, "Exception thrown while adding UserAccountDeletion.");
            return Errors.UnexpectedError();
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while adding UserAccountDeletion.");
            return Errors.UnexpectedError();
        }

        await sessionService.RemoveAllSession(userId);
        await pendingDeleteAccountCacheProvider.Remove(userId);

        return Result.Success();
    }
}