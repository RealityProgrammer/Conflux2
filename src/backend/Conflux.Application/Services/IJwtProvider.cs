using Conflux.Domain.Entities;

namespace Conflux.Application.Services;

public interface IJwtProvider {
    void GenerateAccessToken(
        ApplicationUser user, 
        IEnumerable<string> roles,
        Guid sessionId,
        out string accessToken, 
        out DateTimeOffset expireAt
    );
    
    void GenerateRefreshToken(out byte[] refreshToken, out DateTimeOffset expireAt);
}