using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IMessagingService {
    Task<Result> SendMessageAsync(string? body, Stream[]? attachmentStreams, CancellationToken cancellationToken = default);
}