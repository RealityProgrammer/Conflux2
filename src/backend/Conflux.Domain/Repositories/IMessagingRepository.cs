namespace Conflux.Domain.Repositories;

public interface IMessagingRepository {
    Task<Result> CreateMessageAsync(
        Guid senderUserId,
        string? body,
        IList<Guid> attachmentIds,
        CancellationToken cancellationToken = default
    );
}