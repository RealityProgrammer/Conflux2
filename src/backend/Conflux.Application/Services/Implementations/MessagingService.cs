using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Services.Implementations;

public class MessagingServiceOptions {
    public int MaxAttachmentsCount { get; set; } = 4;
    public long MaxAttachmentSizeBytes { get; set; } = 10485760;
}

internal sealed class MessagingService(
    IMessagingRepository messagingRepository
) : IMessagingService {
    public async Task<Result> SendMessageAsync(
        string? body, 
        Stream[]? attachmentStreams, 
        CancellationToken cancellationToken = default
    ) {
        throw new NotImplementedException();
    }
}