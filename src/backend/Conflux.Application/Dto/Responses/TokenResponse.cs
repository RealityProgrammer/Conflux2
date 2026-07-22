namespace Conflux.Application.Dto.Responses;

public readonly record struct TokenResponse(
    string AccessToken, 
    long AccessTokenExpireTick, 
    string RefreshToken, 
    long RefreshTokenExpireTick
);