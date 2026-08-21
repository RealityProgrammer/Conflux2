using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Commands;

public sealed record SendMessageCommand(
    Guid SenderUserId,
    Guid ChannelId,
    string? Body,
    IReadOnlyList<Stream> AttachmentStreams,
    Guid? ReplyToId
) : ICommand<Result<MessageDto>>;