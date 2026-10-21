using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Conflux.Application.Features.Identity;

public sealed record DeleteAccountCommand(
    UserAccountDeleteReason Reason,
    string? ExtraMessage,
    string RestorationPassword
) : ICommand<Result>;

public sealed class DeleteAccountHandler(
    ICurrentUserService currentUserService,
    IUserRepository userRepository,
    IUserAccountDeletionReadRepository accountDeletionReadRepository,
    IUserAccountDeletionWriteRepository accountDeletionWriteRepository,
    IUnitOfWork unitOfWork,
    ILogger<DeleteAccountHandler> logger,
    ISessionService sessionService,
    IAccountDeleteStatusCacheProvider accountDeleteStatusCacheProvider,
    IPasswordHasher<object> passwordHasher
) : ICommandHandler<DeleteAccountCommand, Result> {
    public async ValueTask<Result> Handle(DeleteAccountCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        // no need to check if account already have a request here, RequiresActiveAccountBehavior already done it
        
        // if user is already having a pending request, return success
        bool hasPendingRequest = await accountDeletionReadRepository
            .AsQueryable()
            .Where(r => r.UserId == userId && r.Status == UserAccountDeleteStatus.Pending)
            .AnyAsync(cancellationToken);

        if (hasPendingRequest) {
            return Errors.PendingAccountDeletionExists();
        }
        
        string hashedPassword = passwordHasher.HashPassword(new(), command.RestorationPassword);

        UserAccountDeletion request = new() {
            UserId = userId,
            Reason = command.Reason,
            ExtraMessage = command.ExtraMessage,
            Status = UserAccountDeleteStatus.Pending,
            RestorationPasswordHash = hashedPassword,
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
        await accountDeleteStatusCacheProvider.Remove(userId);

        return Result.Success();
    }
}