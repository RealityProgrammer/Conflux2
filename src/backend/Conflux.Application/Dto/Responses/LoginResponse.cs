namespace Conflux.Application.Dto.Responses;

public sealed record LoginResponse(
    UserAuthorizationInfo AuthorizationInfo, 
    string TokenType, 
    string AccessToken, 
    string RefreshToken
);