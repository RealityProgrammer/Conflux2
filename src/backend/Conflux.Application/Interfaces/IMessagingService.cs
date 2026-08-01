using Conflux.Domain;

namespace Conflux.Application.Interfaces;

public interface IMessagingService {
    Task<Result> SendMessageAsync(
        Guid senderUserId,
        Guid channelId,
        string? body, 
        IList<Guid> attachmentKeys, 
        CancellationToken cancellationToken = default
    );
}