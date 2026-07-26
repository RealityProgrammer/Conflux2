namespace Conflux.Application.Dto.Responses;

public sealed record RefreshResponse(
    UserAuthorizationInfo AuthorizationInfo, 
    string TokenType, 
    string AccessToken
);