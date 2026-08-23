using Conflux.Application.Commands;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class JoinServerWithInvitationHandler(
    IInvitationRepository invitationRepository,
    ICommunityServerMemberRepository communityServerMemberRepository,
    IUnitOfWork unitOfWork
) : ICommandHandler<JoinServerWithInvitationCommand, Result> {
    public async ValueTask<Result> Handle(JoinServerWithInvitationCommand command, CancellationToken cancellationToken) {
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

        if (await communityServerMemberRepository.IsUserJoined(command.UserId, invite.CommunityServerId, cancellationToken)) {
            return Errors.AlreadyJoinedServer();
        }

        await unitOfWork.BeginTransactionAsync(cancellationToken);
        try {
            Result result = 
                await invitationRepository.AcceptInvitation(command.UserId, command.InvitationId, cancellationToken);

            if (!result.IsSuccess) {
                return result;
            }

            CommunityServerMember member = new() {
                UserId = command.UserId,
                CommunityServerId = invite.CommunityServerId,
            };
            
            communityServerMemberRepository.Add(member);
            
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);

            return Result.Success();
        } catch {
            await unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }
    }
}