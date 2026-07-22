namespace Conflux.Application.Dto.Responses;

public record LoginResponse(
    UserAuthorizationInfo AuthorizationInfo, 
    string TokenType, 
    string AccessToken, 
    string RefreshToken
);