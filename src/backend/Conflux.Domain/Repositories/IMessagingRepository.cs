namespace Conflux.Domain.Repositories;

public interface IMessagingRepository {
    Task<Result<Message>> CreateMessageAsync(
        Guid senderUserId,
        Guid conversationId,
        string? body,
        Guid[] attachmentIds,
        CancellationToken cancellationToken = default
    );
}