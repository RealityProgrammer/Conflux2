namespace Conflux.Application.Dto;

public sealed record UserAuthorizationInfo(
    Guid Id,
    bool IsVerified,
    bool IsPendingDelete,
    bool IsProfileSetup,
    IReadOnlyList<string> Roles, 
    IReadOnlyList<string> Permissions
);