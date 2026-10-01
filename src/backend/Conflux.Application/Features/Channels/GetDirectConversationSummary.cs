using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Channels;

public sealed record GetDirectConversationSummaryQuery(
    Guid UserId, 
    Guid PeerId
) : IQuery<Result<DirectConversationSummary>>;

public sealed class GetDirectConversationSummaryHandler(
    IUserRepository userRepository,
    IFriendRequestRepository friendRequestRepository,
    IConversationRepository conversationRepository,
    IUnitOfWork unitOfWork
) : IQueryHandler<GetDirectConversationSummaryQuery, Result<DirectConversationSummary>> {
    public async ValueTask<Result<DirectConversationSummary>> Handle(GetDirectConversationSummaryQuery query, CancellationToken cancellationToken) {
        // fetch peer profile
        var peerProfile = await userRepository
            .AsQueryable()
            .AsNoTracking()
            .Where(u => u.Id == query.PeerId)
            .Select(u => new UserIdentityProfileDto {
                Id = u.Id,
                UserName = u.UserName,
                DisplayName = u.DisplayName,
                AvatarRevision = u.AvatarRevision,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (peerProfile is null) {
            return Errors.NoUserFoundFromId(query.PeerId);
        }
        
        var friendRequest = await friendRequestRepository
            .AsQueryable()
            .Where(fr => 
                fr.SenderUserId == query.UserId && fr.ReceiverUserId == query.PeerId ||
                fr.SenderUserId == query.PeerId && fr.ReceiverUserId == query.UserId
            )
            .Include(r => r.DirectConversation)
            .FirstOrDefaultAsync(cancellationToken);

        if (friendRequest == null) {
            return Errors.NoAcceptedFriendRequest();
        }

        if (friendRequest.DirectConversation != null) {
            return Result<DirectConversationSummary>.Success(new(
                friendRequest.DirectConversation.Id,
                peerProfile,
                friendRequest.Status
            ));
        }

        if (friendRequest.Status != FriendRequestStatus.Accepted) {
            return Errors.NoAcceptedFriendRequest();
        }

        Conversation newConversation = friendRequest.DirectConversation = new() {
            Type = ConversationType.Direct,
            Participants = [
                new() {
                    UserId = query.UserId,
                },
                new() {
                    UserId = query.PeerId,
                },
            ],
        };
        
        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (DbUpdateException) {
            newConversation = await conversationRepository
                .AsQueryable()
                .FirstAsync(c => 
                    c.Type == ConversationType.Direct && 
                    c.Participants.Any(p => p.UserId == query.UserId) && 
                    c.Participants.Any(p => p.UserId == query.PeerId
                ), cancellationToken);
        }
        
        return Result<DirectConversationSummary>.Success(new(
            newConversation.Id,
            peerProfile,
            friendRequest.Status
        ));
    }
}