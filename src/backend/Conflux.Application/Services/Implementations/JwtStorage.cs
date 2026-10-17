using Conflux.Application.Options;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using System.Buffers.Text;
using System.Security.Cryptography;

namespace Conflux.Application.Services.Implementations;

public sealed class JwtStorage(
    UserManager<ApplicationUser> userManager,
    TimeProvider timeProvider,
    IOptions<JwtOptions> authOptions
) : IJwtStorage {
    private const string ApplicationJwtLoginProvider = "AppJWT";

    private readonly JwtOptions _jwtOptions = authOptions.Value;
    
    public async Task<Result> StoresAuthenticationToken(ApplicationUser user, byte[] token, DateTimeOffset expiration) {
        ReadOnlySpan<byte> secret = Encoding.UTF8.GetBytes(_jwtOptions.RefreshTokenSecret);
        Span<byte> encryptedRefreshToken = stackalloc byte[HMACSHA256.HashSizeInBytes];

        if (!HMACSHA256.TryHashData(secret, token, encryptedRefreshToken, out _)) {
            return Errors.OperationFailure("calculate hash of refresh token");
        }
        
        string encodedTokenHash = Convert.ToBase64String(encryptedRefreshToken);
        
        IdentityResult identityResult = await userManager.SetAuthenticationTokenAsync(
            user, 
            ApplicationJwtLoginProvider, 
            "RefreshToken", 
            $"{encodedTokenHash}:{expiration.Ticks}"
        );
            
        if (!identityResult.Succeeded) {
            return Errors.OperationFailure("set authentication token");
        }

        return Result.Success();
    }

    public async Task<Result> CheckAuthenticationToken(ApplicationUser user, byte[] token) {
        var storedData = await userManager.GetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken");
        
        if (string.IsNullOrEmpty(storedData)) {
            return Errors.InvalidRefreshToken();
        }
        
        int firstColon = storedData.IndexOf(':');
        
        // failure if somehow the data is corrupted.
        if (firstColon == -1 || !long.TryParse(storedData.AsSpan(firstColon + 1), out var expireTick)) {
            return Errors.InvalidRefreshToken();
        }

        // fail if token expired.
        if (timeProvider.GetUtcNow().Ticks > expireTick) {
            return Errors.ExpiredRefreshToken();
        }

        byte[] decryptedRefreshToken = Convert.FromBase64String(storedData[..firstColon]);
        
        ReadOnlySpan<byte> secret = Encoding.UTF8.GetBytes(_jwtOptions.RefreshTokenSecret);
        Span<byte> encryptedRefreshToken = stackalloc byte[HMACSHA256.HashSizeInBytes];

        if (!HMACSHA256.TryHashData(secret, token, encryptedRefreshToken, out _)) {
            return Errors.OperationFailure("calculate hash of refresh token");
        }
        
        // compare the tokens.
        if (!encryptedRefreshToken.SequenceEqual(decryptedRefreshToken)) {
            return Errors.InvalidRefreshToken();
        }

        return Result.Success();
    }
}