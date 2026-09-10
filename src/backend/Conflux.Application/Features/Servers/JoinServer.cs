using Conflux.Application.Extensions;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record JoinServerCommand(Guid UserId, string InvitationId) : ICommand<Result>;

public sealed class JoinServerHandler(
    IInvitationRepository invitationRepository,
    IServerMemberWriteRepository memberWriteRepository,
    IServerMemberReadRepository memberReadRepository,
    IUnitOfWork unitOfWork,
    ILogger<JoinServerHandler> logger,
    TimeProvider timeProvider
) : ICommandHandler<JoinServerCommand, Result> {
    public async ValueTask<Result> Handle(JoinServerCommand command, CancellationToken cancellationToken) {
        var invite = await invitationRepository.GetFromId(command.InvitationId, cancellationToken);

        if (invite == null) {
            return Errors.ResourceNotFound("Invitation");
        }

        if (invite.ExpiresAt.HasValue && invite.ExpiresAt.Value <= DateTime.UtcNow) {
            return Errors.ResourceExpired("Invitation");
        }

        if (invite.MaxUses.HasValue && invite.CurrentUses >= invite.MaxUses.Value) {
            return Errors.ResourceMaxUsed("Invitation");
        }

        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try {
            Result result =
                await invitationRepository.AcceptInvitation(command.UserId, command.InvitationId, cancellationToken);

            if (!result.IsSuccess) {
                return result;
            }

            var member = await memberReadRepository.AsQueryable()
                .Where(m => m.CommunityServerId == invite.CommunityServerId && m.UserId == command.UserId)
                .FirstOrDefaultAsync(cancellationToken);

            if (member != null) {
                if (member.Status == MembershipStatus.Active) {
                    return Errors.AlreadyJoinedServer();
                }

                member.Status = MembershipStatus.Active;
                member.CreatedAt = timeProvider.GetUtcNow();
            } else {
                CommunityServerMember newMember = new() {
                    UserId = command.UserId,
                    CommunityServerId = invite.CommunityServerId,
                    Status = MembershipStatus.Active,
                };
                
                memberWriteRepository.Add(newMember);
            }

            await unitOfWork.SaveChangesAsync(cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);

            return Result.Success();
        } catch (OperationCanceledException) {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Error occurred while joining server");
            
            return Errors.UnexpectedError();
        }
    }
}