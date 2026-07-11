namespace Conflux.Application.Responses;

public record RefreshResponse(
    UserAuthorizationInfo AuthorizationInfo, 
    string TokenType, 
    string AccessToken, 
    string RefreshToken
);