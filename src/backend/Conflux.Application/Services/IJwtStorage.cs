using Conflux.Domain;
using Conflux.Domain.Entities;

namespace Conflux.Application.Services;

public interface IJwtStorage {
    Task<Result> StoreRefreshToken(ApplicationUser user, Guid sessionId, byte[] refreshToken, DateTimeOffset expiration);
    Task<Result> CheckRefreshToken(ApplicationUser user, Guid sessionId, byte[] refreshToken);
}