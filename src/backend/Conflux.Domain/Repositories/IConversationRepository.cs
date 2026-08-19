using Conflux.Domain.Dto;

namespace Conflux.Domain.Repositories;

public interface IConversationRepository {
    Task<Result<ChannelMetadata>> GetChannelMetadata(
        Guid conversationId, 
        CancellationToken cancellationToken = default
    );
    
    Task<Result> UpdateLatestMessageTime(Guid conversationId, DateTimeOffset time);
}