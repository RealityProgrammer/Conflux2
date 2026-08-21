using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface IMessageService {
    Task<Result<GetMessagesResponse>> GetTimelineMessages(
        Guid requesterUserId,
        Guid channelId,
        MessageLoadDirection? direction,
        Guid? cursorMessageId,
        int count,
        CancellationToken cancellationToken = default
    );
}