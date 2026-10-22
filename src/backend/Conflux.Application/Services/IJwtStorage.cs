using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Entities;

namespace Conflux.Application.Services;

public interface IJwtStorage {
    Task<Result> StoreRefreshToken(ApplicationUser user, Guid sessionId, byte[] refreshToken, DateTimeOffset expiration);
    Task<Result<RefreshTokenRotationResult>> RotateRefreshToken(ApplicationUser user, Guid sessionId, byte[] incomingRefreshToken);

    Task<int> CleanupExpiredTokens(CancellationToken cancellationToken = default);
}