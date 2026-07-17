namespace Conflux.Application.Responses;

public record UserAuthorizationInfo(
    Guid Id,
    string UserName, 
    bool IsVerified,
    bool IsProfileSetup,
    IReadOnlyList<string> Roles, 
    IReadOnlyList<string> Permissions
);