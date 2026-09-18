using Conflux.Domain.Entities;

namespace Conflux.Application.Services;

public interface IJwtProvider {
    void GenerateAccessToken(ApplicationUser user, IEnumerable<string> roles, out string accessToken, out long expireTick);
    void GenerateRefreshToken(out string refreshToken, out DateTimeOffset expiration);
}