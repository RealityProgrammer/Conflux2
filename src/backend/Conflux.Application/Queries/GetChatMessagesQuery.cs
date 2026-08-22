using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Queries;

public sealed record GetChatMessagesQuery(
    Guid RequesterUserId,
    Guid ChannelId,
    MessageLoadDirection? Direction,
    Guid? CursorMessageId,
    int Count
) : IQuery<Result<GetMessagesResponse>>;