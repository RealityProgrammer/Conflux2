namespace Conflux.Application.Responses;

public record UserAuthorizationInfo(string UserName, IReadOnlyList<string> Roles, IReadOnlyList<string> Permissions);