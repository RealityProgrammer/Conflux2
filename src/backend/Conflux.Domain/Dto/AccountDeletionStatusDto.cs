using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record AccountDeletionStatusDto(
    DateTimeOffset ScheduledAt,
    DateTimeOffset DeleteAt,
    UserAccountDeleteReason Reason,
    string? ExtraMessage
);