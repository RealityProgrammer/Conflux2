using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IMessageRepository : IWriteRepository<Message> {
    Task<Result<TimelineMessagePage>> GetTimelineMessages(
        Guid conversationId, 
        MessageReadStrategy readStrategy,
        int limit,
        CancellationToken cancellationToken = default
    );

    Task<Result<MessageSearchPage>> Search(
        Guid conversationId,
        string query,
        int limit,
        CancellationToken cancellationToken = default
    );
}