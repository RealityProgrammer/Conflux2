namespace Conflux.Application.Dto.Responses;

public record RefreshResponse(
    UserAuthorizationInfo AuthorizationInfo, 
    string TokenType, 
    string AccessToken
);