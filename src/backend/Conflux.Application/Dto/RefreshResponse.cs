namespace Conflux.Application.Dto;

public sealed record RefreshResponse(
    UserAuthorizationInfo AuthorizationInfo, 
    string TokenType, 
    string AccessToken
);