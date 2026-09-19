using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;

namespace Conflux.Domain.Repositories;

public interface IMessageRepository : IWriteRepository<Message> {
    Task<Result<PagedTimelineMessageResult>> GetTimelineMessages(
        Guid conversationId, 
        MessageLoadDirection? direction, 
        Guid? cursorMessageId,
        int limit,
        CancellationToken cancellationToken = default
    );

    Task<Attachment?> GetAttachmentById(Guid id, CancellationToken cancellationToken = default);
}