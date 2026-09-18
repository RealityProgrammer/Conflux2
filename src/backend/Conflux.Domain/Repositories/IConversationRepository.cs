using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IConversationRepository : IRepository<Conversation> {
    Task<Result<ChannelMetadataDto>> GetChannelMetadata(
        Guid conversationId, 
        CancellationToken cancellationToken = default
    );
    
    Task<Result> UpdateLatestMessageTime(Guid conversationId, DateTimeOffset time);
}