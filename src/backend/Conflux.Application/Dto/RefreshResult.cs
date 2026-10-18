namespace Conflux.Application.Dto;

public sealed record RefreshResult(
    UserAuthorizationInfo AuthorizationInfo, 
    string TokenType, 
    string AccessToken,
    DateTimeOffset AccessTokenExpireAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpireAt
);