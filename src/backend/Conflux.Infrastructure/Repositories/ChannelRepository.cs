using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class ChannelRepository(
    ApplicationDbContext dbContext,
    TimeProvider timeProvider
) : IChannelRepository {
    public async Task<Result<ConversationPostingContext>> GetPostingContextFromChannelIdAsync(Guid userId, Guid channelId) {
        ConversationPostingContext? result = await dbContext.Channels
            .Where(c => c.Id == channelId)
            .Include(c => c.Conversation)
            .Select(c => new ConversationPostingContext(
                channelId,
                c.Type, 
                c.Type == ChannelType.DirectMessage ? 
                    new DMConversationContext(
                        c.FriendRequest!.SenderUserId, 
                        c.FriendRequest.ReceiverUserId, 
                        c.FriendRequest.Status == FriendRequestStatus.Accepted
                    )
                    : null,
                c.ConversationId
            ))
            .FirstOrDefaultAsync();

        if (result == null) {
            return Errors.ResourceNotFound("Channel");
        }
        
        return Result<ConversationPostingContext>.Success(result);
    }

    public async Task<Result<ConversationPostingContext>> GetPostingContextFromConversationId(Guid userId, Guid conversationId) {
        ConversationPostingContext? result = await dbContext.Channels
            .Where(c => c.ConversationId == conversationId)
            .Include(c => c.Conversation)
            .Select(c => new ConversationPostingContext(
                c.Id,
                c.Type, 
                c.Type == ChannelType.DirectMessage ? 
                    new DMConversationContext(
                        c.FriendRequest!.SenderUserId, 
                        c.FriendRequest.ReceiverUserId,
                        c.FriendRequest.Status == FriendRequestStatus.Accepted
                    )
                    : null,
                conversationId
            ))
            .FirstOrDefaultAsync();

        if (result == null) {
            return Errors.ResourceNotFound("Conversation");
        }
        
        return Result<ConversationPostingContext>.Success(result);
    }

    public async Task<Result<DirectMessageChannelSummary>> GetDirectMessageChannelSummaryAsync(Guid userId, Guid channelId) {
        var summary = await dbContext.Channels
            .Where(c =>
                c.Type == ChannelType.DirectMessage &&
                c.FriendRequest != null &&
                (c.FriendRequest.SenderUserId == userId || c.FriendRequest.ReceiverUserId == userId) &&
                c.Id == channelId
            )
            .Join(
                dbContext.FriendRequests,
                c => c.FriendRequestId,
                fr => fr.Id,
                (c, fr) => new { Channel = c, FriendRequest = fr }
            )
            .Join(
                dbContext.Users,
                cfr => cfr.FriendRequest.SenderUserId == userId ? cfr.FriendRequest.ReceiverUserId : cfr.FriendRequest.SenderUserId,
                u => u.Id,
                (cfr, u) => new { cfr.Channel, cfr.FriendRequest, User = u }
            )
            .Select(cfru => 
                new DirectMessageChannelSummary(
                    new(cfru.User.Id, cfru.User.UserName, cfru.User.DisplayName, cfru.User.HasAvatar)
                )
            )
            .FirstOrDefaultAsync();

        return summary != null ?
            Result<DirectMessageChannelSummary>.Success(summary) :
            Errors.NoDirectMessageChannelWithId();
    }

    public async Task<Result<ChannelResolutionResult>> GetOrCreateDirectMessageChannelAsync(Guid user1, Guid user2) {
        // we want to keep chat history even if users are unfriended (no friended request due to unfriending) so
        // have to do this join query
        var friendRequestSummary = await dbContext.FriendRequests
            .Where(fr =>
                fr.SenderUserId == user1 && fr.ReceiverUserId == user2 ||
                fr.SenderUserId == user2 && fr.ReceiverUserId == user1
            )
            .Include(fr => fr.ConversationChannel)
            .Select(fr => new {
                fr.Id,
                fr.Status,
                ConversationChannelId = fr.ConversationChannel == null ? (Guid?)null : fr.ConversationChannel.Id,
            })
            .FirstOrDefaultAsync();

        // no friend request, bail out early
        if (friendRequestSummary == null) {
            return Errors.NoFriendRequest();
        }

        // might not having accepted friend request, but there is a existing conversation channel, so return it
        if (friendRequestSummary.ConversationChannelId is { } existingChannelId) {
            return Result<ChannelResolutionResult>.Success(new(existingChannelId, ChannelResolutionStatus.Existing));
        }
        
        // no existing conversation channel, so ensure the existing friend request is accepted before creating one
        if (friendRequestSummary.Status != FriendRequestStatus.Accepted) {
            return Errors.NoAcceptedFriendRequest();
        }
        
        // create the conversation channel

        DateTimeOffset utcNow = timeProvider.GetUtcNow();

        Conversation conversation = new();

        Channel channel = new() {
            Type = ChannelType.DirectMessage,
            Conversation = conversation,
            CreatedAt = utcNow,
            FriendRequestId = friendRequestSummary.Id,
            Members = new List<ChannelMember> {
                new() {
                    UserId = user1,
                },
                new() {
                    UserId = user2,
                },
            },
        };

        try {
            dbContext.Channels.Add(channel);
            await dbContext.SaveChangesAsync();

            return Result<ChannelResolutionResult>.Success(new(channel.Id, ChannelResolutionStatus.Created));
        } catch (DbUpdateException) {
            // potential concurrency when 2 creates happen at the same time.
            // TODO: inspect the exception deeper
            var raceConditionChannelId = await dbContext.Channels
                .Where(c => c.Type == ChannelType.DirectMessage && c.FriendRequestId == friendRequestSummary.Id)
                .Select(c => c.Id)
                .FirstAsync();

            return Result<ChannelResolutionResult>.Success(new(raceConditionChannelId, ChannelResolutionStatus.Existing));
        }
    }
}