namespace Conflux.Application.Responses;

public record LoginResponse(
    UserAuthorizationInfo AuthorizationInfo, 
    string TokenType, 
    string AccessToken, 
    string RefreshToken
);