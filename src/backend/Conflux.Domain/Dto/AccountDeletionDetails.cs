using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record AccountDeletionDetails(
    AccountDeletionStatus Status,
    TimeSpan ExpiryTime
);