using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;

namespace Conflux.Infrastructure.Repositories;

internal sealed class ChannelRepository(
    ApplicationDbContext dbContext
) : IChannelRepository {
    public void Add(Channel channel) {
        dbContext.Channels.Add(channel);
    }

    public async Task<Result<ChannelMetadataDto>> GetChannelMetadataFromChannelId(
        Guid channelId,
        CancellationToken cancellationToken = default
    ) {
        ChannelMetadataDto? context = await dbContext.Channels
            .Where(c => c.Id == channelId)
            .SelectFacet<ChannelMetadataDto>()
            .FirstOrDefaultAsync(cancellationToken);

        if (context == null) {
            return Errors.ResourceNotFound("Channel");
        }

        return Result<ChannelMetadataDto>.Success(context);
    }

    public async Task<Result<DmChannelSummary>> GetDmChannelSummary(Guid userId, Guid channelId) {
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
                new DmChannelSummary(
                    cfru.Channel.Id,
                    new(cfru.User),
                    cfru.FriendRequest.Status
                )
            )
            .FirstOrDefaultAsync();

        return summary != null ?
            Result<DmChannelSummary>.Success(summary) :
            Errors.ResourceNotFound("Direct message channel");
    }

    public async Task<FriendDmChannelSummaryDto?> GetFriendDmChannelSummary(Guid userId1, Guid userId2) {
        return await dbContext.FriendRequests
            .Where(fr =>
                fr.SenderUserId == userId1 && fr.ReceiverUserId == userId2 ||
                fr.SenderUserId == userId2 && fr.ReceiverUserId == userId1
            )
            .Include(fr => fr.ConversationChannel)
            .Select(fr => new FriendDmChannelSummaryDto(
                fr.Id,
                fr.Status,
                fr.ConversationChannel == null ? null : fr.ConversationChannel.Id
            ))
            .FirstOrDefaultAsync();
    }

    public async Task<PaginatedResult<DmConversationListItemDto>> GetUserConversations(
        Guid userId, 
        int offset, 
        int count
    ) {
        var query = dbContext.Channels
            .Where(c => c.Type == ChannelType.DirectMessage)
            .Include(c => c.FriendRequest)
            .Include(c => c.Conversation)
            .Where(c => c.FriendRequest!.SenderUserId == userId || c.FriendRequest.ReceiverUserId == userId)
            .Where(c => c.Conversation.LatestMessageAt != null);    // only get message that has any message history
        
        int totalCount = await query.CountAsync();

        var paginated = await query
            .OrderByDescending(c => c.Conversation.LatestMessageAt)
            .Select(c => new {
                Channel = c,
                OtherUser = c.FriendRequest!.SenderUserId == userId ? c.FriendRequest.Receiver : c.FriendRequest.Sender,
            })
            .Select(cu =>
                new DmConversationListItemDto(
                    cu.Channel.Id,
                    new(cu.OtherUser)
                )
            )
            .Skip(offset)
            .Take(count)
            .ToListAsync();

        return new(paginated, totalCount);
    }
    
    public async Task<Guid> GetChannelIdFromFriendRequestId(Guid friendRequestId, CancellationToken cancellationToken = default) {
        return await dbContext.Channels
            .Where(c => c.Type == ChannelType.DirectMessage && c.FriendRequestId == friendRequestId)
            .Select(c => c.Id)
            .FirstAsync(cancellationToken);
    }

    public async Task<bool> Delete(Guid serverId, Guid channelId, CancellationToken cancellationToken = default) {
        // TODO: Soft-deletion
        return await dbContext.Channels
            .Where(c => c.CommunityServerId == serverId && c.Id == channelId)
            .ExecuteDeleteAsync(cancellationToken) > 0;
    }
}