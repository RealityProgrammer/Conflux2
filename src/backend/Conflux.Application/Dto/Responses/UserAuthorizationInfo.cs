namespace Conflux.Application.Dto.Responses;

public sealed record UserAuthorizationInfo(
    Guid Id,
    bool IsVerified,
    bool IsProfileSetup,
    IReadOnlyList<string> Roles, 
    IReadOnlyList<string> Permissions
);