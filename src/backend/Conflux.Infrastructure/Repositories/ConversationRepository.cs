using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class ConversationRepository(
    ApplicationDbContext dbContext
) : IConversationRepository {
    public async Task<Result<ChannelMetadata>> GetChannelMetadataAsync(
        Guid conversationId,
        CancellationToken cancellationToken = default
    ) {
        ChannelMetadata? context = await dbContext.Channels
            .Where(c => c.ConversationId == conversationId && c.Type == ChannelType.DirectMessage)
            .Select(c => new ChannelMetadata(
                c.Id,
                conversationId,
                c.Type
            ))
            .FirstOrDefaultAsync(cancellationToken);

        if (context == null) {
            return Errors.ResourceNotFound("Channel");
        }

        return Result<ChannelMetadata>.Success(context);
    }
    
    public async Task<Result> UpdateLatestMessageTimeAsync(Guid conversationId, DateTimeOffset time) {
        int changed = await dbContext.Conversations
            .Where(c => c.Id == conversationId)
            .ExecuteUpdateAsync(setter => {
                setter.SetProperty(c => c.LatestMessageAt, time);
            });

        return changed == 1 ? Result.Success() : Errors.ResourceNotFound("Conversation");
    }
}