namespace Conflux.Application.Responses;

public record UserAuthorizationInfo(
    string UserName, 
    bool IsVerified,
    bool IsProfileSetup,
    IReadOnlyList<string> Roles, 
    IReadOnlyList<string> Permissions
);