using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface IMessageService {
    Task<Result<MessageDto>> SendMessage(
        Guid senderUserId,
        Guid channelId,
        string? body, 
        IReadOnlyList<Stream> attachmentStreams,
        Guid? replyToId,
        CancellationToken cancellationToken = default
    );

    Task<Result<MessageDto>> EditMessage(
        Guid messageId,
        Guid requesterUserId,
        string? newBody,
        CancellationToken cancellationToken = default
    );

    Task<Result> DeleteMessage(
        Guid messageId,
        Guid requesterUserId
    );

    Task<Result<GetMessagesResponse>> GetTimelineMessages(
        Guid requesterUserId,
        Guid channelId,
        MessageLoadDirection? direction,
        Guid? cursorMessageId,
        int count,
        CancellationToken cancellationToken = default
    );
    
    string GetAttachmentUrl(Guid attachmentId);
}