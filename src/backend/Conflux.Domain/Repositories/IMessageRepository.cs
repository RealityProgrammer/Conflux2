using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;

namespace Conflux.Domain.Repositories;

public interface IMessageRepository {
    void Add(Message message);

    Task<Message?> GetById(Guid messageId, bool tracking = true, CancellationToken cancellationToken = default);
    
    Task<TimelineMessageReplyDto?> GetReplyMessageById(Guid messageId, CancellationToken cancellationToken = default);

    Task<Result<PagedTimelineMessageResult>> GetTimelineMessages(
        Guid conversationId, 
        MessageLoadDirection? direction, 
        Guid? cursorMessageId,
        int limit,
        CancellationToken cancellationToken = default
    );
}