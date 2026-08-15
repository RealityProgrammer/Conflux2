using Conflux.Application.Dto.Responses;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface IMessageService {
    Task<Result<MessageDto>> SendMessageAsync(
        Guid senderUserId,
        Guid channelId,
        string? body, 
        IReadOnlyList<Stream> attachmentStreams,
        Guid? replyToId,
        CancellationToken cancellationToken = default
    );

    Task<Result<MessageDto>> EditMessageAsync(
        Guid messageId,
        Guid requesterUserId,
        string? newBody,
        CancellationToken cancellationToken = default
    );

    Task<Result> DeleteMessageAsync(
        Guid messageId,
        Guid requesterUserId
    );

    Task<Result<GetMessagesResponse>> GetTimelineMessagesAsync(
        Guid requesterUserId,
        Guid channelId,
        MessageLoadDirection? direction,
        Guid? cursorMessageId,
        int count,
        CancellationToken cancellationToken = default
    );
    
    string GetAttachmentUrl(Guid attachmentId);
}