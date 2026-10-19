using Conflux.Application.Options;
using Conflux.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using JwtRegisteredClaimNames = Microsoft.IdentityModel.JsonWebTokens.JwtRegisteredClaimNames;

namespace Conflux.Application.Services.Implementations;

internal sealed class JwtProvider(
    TimeProvider timeProvider,
    IOptions<AuthOptions> authOptions,
    IOptions<JwtOptions> jwtOptions
) : IJwtProvider {
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;
    private readonly AuthOptions _authOptions = authOptions.Value;
    
    public void GenerateAccessToken(
        ApplicationUser user, 
        IEnumerable<string> roles,
        Guid sessionId,
        out string accessToken, 
        out DateTimeOffset expireAt
    ) {
        var claims = new List<Claim> {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email!),
            new(JwtRegisteredClaimNames.Jti, sessionId.ToString()),
        };
        
        if (user.EmailConfirmed) {
            claims.Add(new(JwtRegisteredClaimNames.EmailVerified, "true"));
        }
        
        if (user.IsUserNameLocked) {
            claims.Add(new("ProfileSetupComplete", "true"));
        }
        
        foreach (var role in roles) {
            claims.Add(new("role", role));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.Secret));
        var credential = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        DateTimeOffset accessTokenExpire = timeProvider.GetUtcNow().AddSeconds(_authOptions.AccessTokenDuration);

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            expires: accessTokenExpire.UtcDateTime,
            signingCredentials: credential
        );

        accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        expireAt = accessTokenExpire;
    }
    
    public void GenerateRefreshToken(out byte[] refreshToken, out DateTimeOffset expireAt) {
        refreshToken = RandomNumberGenerator.GetBytes(64);
        expireAt = timeProvider.GetUtcNow().AddSeconds(_authOptions.RefreshTokenDuration);
    }
}