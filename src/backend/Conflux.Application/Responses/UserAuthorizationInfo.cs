namespace Conflux.Application.Responses;

public record UserAuthorizationInfo(
    Guid Id,
    bool IsVerified,
    bool IsProfileSetup,
    IReadOnlyList<string> Roles, 
    IReadOnlyList<string> Permissions
);