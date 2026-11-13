using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;

namespace Conflux.Domain.Repositories;

public interface IMessageRepository : IRepository<Message> {
    Task<Result<TimelineMessagePage>> GetTimelineMessages(
        Guid conversationId, 
        MessageReadStrategy readStrategy,
        int limit,
        CancellationToken cancellationToken = default
    );

    Task<Result<MessageSearchPage>> Search(
        Guid conversationId,
        string? content,
		IReadOnlyCollection<Guid>? senderIds,
		DateTimeOffset? startDateTime,
		DateTimeOffset? endDateTime,
		MessagePinFilter pin,
		Guid? beforeCursor,
        int limit,
        CancellationToken cancellationToken = default
    );
}
