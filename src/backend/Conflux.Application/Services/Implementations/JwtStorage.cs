using Conflux.Application.Dto;
using Conflux.Application.Options;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;

namespace Conflux.Application.Services.Implementations;

public sealed class JwtStorage(
    UserManager<ApplicationUser> userManager,
    TimeProvider timeProvider,
    IOptions<JwtOptions> authOptions,
    IJwtProvider jwtProvider
) : IJwtStorage {
    // storage format: <token hash>:<expiration tick>:<rotate tick, 0 if fresh>(:<previous_token_hash>)?
    private const string ApplicationJwtLoginProvider = "AppJWT";

    private readonly JwtOptions _jwtOptions = authOptions.Value;
    
    public async Task<Result> StoreRefreshToken(ApplicationUser user, Guid sessionId, byte[] refreshToken, DateTimeOffset expiration) {
        string tokenName = $"RefreshToken_{sessionId}";
        string encodedTokenHash = HashAndEncodeToken(refreshToken);
        
        // just in case
        await userManager.RemoveAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, tokenName);
        
        // initial with no rotate tick (0) and no previous hash
        IdentityResult identityResult = await userManager.SetAuthenticationTokenAsync(
            user, 
            ApplicationJwtLoginProvider, 
            tokenName,
            $"{encodedTokenHash}:{expiration.Ticks}:0"
        );
            
        if (!identityResult.Succeeded) {
            return Errors.OperationFailure("set authentication token");
        }

        return Result.Success();
    }

    public async Task<Result<RefreshTokenRotationResult>> RotateRefreshToken(
        ApplicationUser user, 
        Guid sessionId, 
        byte[] incomingRefreshToken
    ) {
        string tokenName =  $"RefreshToken_{sessionId}";
        var storedData = await userManager.GetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, tokenName);

        if (string.IsNullOrEmpty(storedData)) {
            return Errors.InvalidRefreshToken();
        }
        
        var parts = storedData.Split(':', 4);
        
        if (parts.Length < 3 ||
            !long.TryParse(parts[1], out var expireTick) ||
            !long.TryParse(parts[2], out var rotateAtTick)
        ) {
            return Errors.InvalidRefreshToken();
        }

        if (timeProvider.GetUtcNow().Ticks > expireTick) {
            return Errors.ExpiredRefreshToken();
        }

        byte[] currentTokenHash;
        try {
            currentTokenHash = Convert.FromBase64String(parts[0]);
        } catch {
            return Errors.InvalidRefreshToken();
        }

        Span<byte> incomingTokenHash = stackalloc byte[HMACSHA256.HashSizeInBytes];
        HashTokenBytes(incomingRefreshToken, incomingTokenHash);
        
        bool isCurrentMatch = currentTokenHash.SequenceEqual(incomingTokenHash);
        bool isPreviousMatch = false;
        
        // if it doesn't match the current token, check if it matches the previous token
        if (!isCurrentMatch && parts.Length >= 4 && !string.IsNullOrEmpty(parts[3])) {
            try {
                byte[] previousTokenHash = Convert.FromBase64String(parts[3]);
                if (previousTokenHash.SequenceEqual(incomingTokenHash)) {
                    isPreviousMatch = true;
                }
            } catch {
                // ignore malformed previous hash
            }
        }
        
        // if matches neither current nor previous, treat as a potential replay attack or invalid token
        if (!isCurrentMatch && !isPreviousMatch) {
            await userManager.RemoveAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, tokenName);
            return Errors.InvalidRefreshToken();
        }
        
        if (isPreviousMatch) {
            if (rotateAtTick == 0) {
                await userManager.RemoveAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, tokenName);
                return Errors.InvalidRefreshToken();
            }

            var rotatedAt = new DateTimeOffset(rotateAtTick, TimeSpan.Zero);
            var gracePeriod = TimeSpan.FromSeconds(10);

            if (timeProvider.GetUtcNow() - rotatedAt > gracePeriod) {
                // outside the grace period window, treat as replay attack or expire or whatever
                await userManager.RemoveAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, tokenName);
                return Errors.InvalidRefreshToken();
            }
        }

        // successful rotation
        jwtProvider.GenerateRefreshToken(out byte[] newRefreshToken, out DateTimeOffset newExpiration);
        string encodedNewTokenHash = HashAndEncodeToken(newRefreshToken);
        
        string updatedStoredValue = $"{encodedNewTokenHash}:{newExpiration.Ticks}:{timeProvider.GetUtcNow().Ticks}:{parts[0]}";
        await userManager.SetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, tokenName, updatedStoredValue);
        
        return Result<RefreshTokenRotationResult>.Success(new(newRefreshToken, newExpiration));
    }
    
    private string HashAndEncodeToken(ReadOnlySpan<byte> token) {
        Span<byte> tokenHash = stackalloc byte[HMACSHA256.HashSizeInBytes];
        HashTokenBytes(token, tokenHash);
        
        return Convert.ToBase64String(tokenHash);
    }
    
    private void HashTokenBytes(ReadOnlySpan<byte> token, Span<byte> output) {
        ReadOnlySpan<byte> secret = Encoding.UTF8.GetBytes(_jwtOptions.RefreshTokenSecret);
        HMACSHA256.TryHashData(secret, token, output, out _);
    }
}