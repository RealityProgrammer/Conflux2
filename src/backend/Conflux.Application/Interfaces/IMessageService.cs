using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;

namespace Conflux.Application.Interfaces;

public interface IMessageService {
    Task<Result> SendMessageAsync(
        Guid senderUserId,
        Guid channelId,
        string? body, 
        IList<Guid> attachmentKeys, 
        CancellationToken cancellationToken = default
    );

    Task<Result<GetMessagesResult>> GetMessagesAsync(
        Guid channelId,
        MessageLoadDirection? direction,
        Guid? cursorMessageId,
        int count,
        CancellationToken cancellationToken = default
    );
}