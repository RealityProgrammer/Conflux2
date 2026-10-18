namespace Conflux.Application.Dto;

public sealed record RefreshTokenRotationResult(
    byte[] NewRefreshToken,
    DateTimeOffset NewExpiration
);