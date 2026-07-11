namespace Conflux.Application.Responses;

public record UserAuthorizationInfo(string UserName, IReadOnlyList<string> Role, IReadOnlyList<string> Permissions);