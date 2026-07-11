namespace Conflux.Application.Core;

public readonly record struct RefreshTokenInfo(string RefreshToken, long ExpireAtTick);