using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;
using DmConversationDetails = Conflux.Application.Dto.DmConversationDetails;

namespace Conflux.Application.Features.Conversation;

public sealed record QueryDmConversationDetails(Guid PeerId) : IQuery<Result<DmConversationDetails>>;

public sealed class QueryDmConversationDetailsHandler(
    ICurrentUserService currentUserService,
    IFriendRequestRepository friendRequestRepository,
    IUserRepository userRepository,
    IConversationRepository conversationRepository
) : IQueryHandler<QueryDmConversationDetails, Result<DmConversationDetails>> {
    public async ValueTask<Result<DmConversationDetails>> Handle(
        QueryDmConversationDetails query, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        var peerId = query.PeerId;
        
        if (userId == peerId) {
            return Errors.DisallowSelfAction("Accessing conversation with yourself is not allowed (yet).");
        }

        var peerProfile = await userRepository
            .AsQueryable()
            .Where(u => u.Id == peerId)
            .SelectFacet<UserIdentityProfileDto>()
            .FirstOrDefaultAsync(cancellationToken);

        if (peerProfile is null) {
            return Errors.ResourceNotFound("User", [
                new(nameof(ApplicationUser.Id), peerId.ToString()),
            ]);
        }

        bool isFriended = await friendRequestRepository
            .AsQueryable()
            .Where(r => 
                r.Status == FriendRequestStatus.Accepted && (
                    r.SenderUserId == userId && r.ReceiverUserId == peerId || 
                    r.SenderUserId == peerId && r.ReceiverUserId == userId
                )
            )
            .AnyAsync(cancellationToken);
        
        var conversationId = await conversationRepository
            .AsQueryable()
            .Where(c => c.Type == ConversationType.Direct &&
                        c.Participants.Any(p => p.UserId == userId) &&
                        c.Participants.Any(p => p.UserId == peerId))
            .Select(c => c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var details = new DmConversationDetails(
            PeerProfile: peerProfile,
            ConversationId: conversationId,
            IsFriended: isFriended
        );

        return Result<DmConversationDetails>.Success(details);
    }
}