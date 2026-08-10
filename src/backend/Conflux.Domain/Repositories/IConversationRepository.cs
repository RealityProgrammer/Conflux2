using Conflux.Domain.Dto;

namespace Conflux.Domain.Repositories;

public interface IConversationRepository {
    Task<Result<ChannelMetadata>> GetChannelMetadataFromConversationIdAsync(
        Guid conversationId, 
        CancellationToken cancellationToken = default
    );
    
    Task<Result> UpdateLatestMessageTimeAsync(Guid conversationId, DateTimeOffset time);
}