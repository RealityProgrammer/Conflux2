using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;

namespace Conflux.Infrastructure.Repositories;

internal sealed class ConversationRepository(
    ApplicationDbContext dbContext
) : IConversationRepository {
    public async Task<Result<ChannelMetadataDto>> GetChannelMetadata(
        Guid conversationId,
        CancellationToken cancellationToken = default
    ) {
        ChannelMetadataDto? context = await dbContext.Channels
            .Where(c => c.ConversationId == conversationId && c.Type == ChannelType.DirectMessage)
            .SelectFacet<ChannelMetadataDto>()
            .FirstOrDefaultAsync(cancellationToken);

        if (context == null) {
            return Errors.ResourceNotFound("Channel");
        }

        return Result<ChannelMetadataDto>.Success(context);
    }
    
    public async Task<Result> UpdateLatestMessageTime(Guid conversationId, DateTimeOffset time) {
        int changed = await dbContext.Conversations
            .Where(c => c.Id == conversationId)
            .ExecuteUpdateAsync(setter => {
                setter.SetProperty(c => c.LatestMessageAt, time);
            });

        return changed == 1 ? Result.Success() : Errors.ResourceNotFound("Conversation");
    }
}