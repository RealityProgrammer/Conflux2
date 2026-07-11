namespace Conflux.Application.Responses;

public readonly record struct TokenResponse(
    string AccessToken, 
    long AccessTokenExpireTick, 
    string RefreshToken, 
    long RefreshTokenExpireTick
);