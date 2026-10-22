using Conflux.Application.Extensions;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Conflux.Application.Features.Servers;

public sealed record JoinServerCommand(string InvitationId) : ICommand<Result>;

public sealed record ServerJoinedNotification(Guid UserId, Guid ServerId) : INotification;

public sealed class JoinServerHandler(
    ICurrentUserService currentUserService,
    IInvitationRepository invitationRepository,
    IServerMemberWriteRepository memberWriteRepository,
    IServerMemberReadRepository memberReadRepository,
    IUnitOfWork unitOfWork,
    ILogger<JoinServerHandler> logger,
    TimeProvider timeProvider,
    IPublisher publisher
) : ICommandHandler<JoinServerCommand, Result> {
    private const int MaxRetries = 5;
    
    public async ValueTask<Result> Handle(JoinServerCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        for (int attempt = 0; attempt < MaxRetries; attempt++) {
            await unitOfWork.BeginTransactionAsync(cancellationToken);

            try {
                // access invitation normally
                Invitation? invitation = await invitationRepository
                    .AsQueryable()
                    .Where(i => i.Id == command.InvitationId)
                    .FirstOrDefaultAsync(cancellationToken);

                if (invitation == null) {
                    await unitOfWork.RollbackAsync(cancellationToken);
                    return Errors.ResourceNotFound("Invitation", [
                        new(nameof(Invitation.Id), command.InvitationId),
                    ]);
                }

                // check invitation expire and max used
                var now = timeProvider.GetUtcNow();

                if (invitation.ExpiresAt.HasValue && invitation.ExpiresAt.Value <= now) {
                    await unitOfWork.RollbackAsync(cancellationToken);
                    return Errors.ResourceExpired("Invitation");
                }

                if (invitation.MaxUses.HasValue && invitation.CurrentUses >= invitation.MaxUses.Value) {
                    await unitOfWork.RollbackAsync(cancellationToken);
                    return Errors.ResourceMaxUsed("Invitation");
                }

                // check member status
                var member = await memberReadRepository.AsQueryable()
                    .Where(m => m.CommunityServerId == invitation.CommunityServerId && m.UserId == userId)
                    .FirstOrDefaultAsync(cancellationToken);

                if (member is { Status: MembershipStatus.Active }) {
                    await unitOfWork.RollbackAsync(cancellationToken);
                    return Errors.AlreadyJoinedServer();
                }

                // mutate
                invitation.CurrentUses++;
                invitation.LastUsedAt = now;

                if (member != null) {
                    member.Status = MembershipStatus.Active;
                    member.CreatedAt = now;
                } else {
                    CommunityServerMember newMember = new() {
                        UserId = userId,
                        CommunityServerId = invitation.CommunityServerId,
                        Status = MembershipStatus.Active,
                    };

                    memberWriteRepository.Add(newMember);
                }

                // attemp save, might throw concurrency exception
                await unitOfWork.SaveChangesAsync(cancellationToken);
                await unitOfWork.CommitAsync(cancellationToken);

                await publisher.Publish(new ServerJoinedNotification(userId, invitation.CommunityServerId), CancellationToken.None);
                
                return Result.Success();
            } catch (DbUpdateConcurrencyException) {
                await unitOfWork.RollbackAsync(cancellationToken);
                
                if (attempt == MaxRetries - 1) {
                    logger.LogWarning("Invitation {InvitationId} experienced concurrency issue and exhausted max retries.", command.InvitationId);
                    return Errors.UnexpectedError();
                }
            } catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation }) {
                await unitOfWork.RollbackAsync(cancellationToken);
                return Errors.AlreadyJoinedServer();
            } catch (OperationCanceledException) {
                await unitOfWork.RollbackAsync(cancellationToken);
                throw;
            } catch (Exception e) {
                await unitOfWork.RollbackAsync(cancellationToken);
                logger.LogError(e, "Exception thrown while joining server.");
                return Errors.UnexpectedError();
            }
        }
        
        return Errors.UnexpectedError();
    }
}