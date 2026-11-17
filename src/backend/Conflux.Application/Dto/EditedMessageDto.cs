using Conflux.Domain.Dto;

namespace Conflux.Application.Dto;

public sealed record EditedMessageDto(string? NewBody, IReadOnlyCollection<MessageAttachmentDto> Attachments);