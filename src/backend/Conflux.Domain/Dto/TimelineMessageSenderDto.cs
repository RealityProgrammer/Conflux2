namespace Conflux.Domain.Dto;

public sealed record TimelineMessageSenderDto(
    Guid Id,
    string? DisplayName,
    int? AvatarVersion
);