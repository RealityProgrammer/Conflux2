namespace Conflux.Application.Dto;

public sealed record LoginResponse(
    UserAuthorizationInfo AuthorizationInfo, 
    string TokenType, 
    string AccessToken, 
    string RefreshToken
);