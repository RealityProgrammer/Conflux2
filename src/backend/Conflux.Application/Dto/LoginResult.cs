namespace Conflux.Application.Dto;

public sealed record LoginResult(
    UserAuthorizationInfo AuthorizationInfo, 
    string TokenType, 
    string AccessToken,
    DateTimeOffset AccessTokenExpireAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpireAt,
    Guid SessionId
);