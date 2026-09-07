using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Services.Implementations;

public sealed class JwtStorage(
    UserManager<ApplicationUser> userManager,
    TimeProvider timeProvider
) : IJwtStorage {
    private const string ApplicationJwtLoginProvider = "AppJWT";

    public async Task<Result> StoresAuthenticationToken(ApplicationUser user, string token, DateTimeOffset expiration) {
        IdentityResult identityResult = await userManager.SetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken", $"{token}:{expiration.Ticks}");
            
        if (!identityResult.Succeeded) {
            return Errors.OperationFailure("set authentication token");
        }

        return Result.Success();
    }

    public async Task<Result> CheckAuthenticationToken(ApplicationUser user, string token) {
        var storedData = await userManager.GetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken");
        
        if (string.IsNullOrEmpty(storedData)) {
            return Errors.InvalidRefreshToken();
        }
        
        int firstColon = storedData.IndexOf(':');
        
        // failure if somehow the data is corrupted or is expired.
        if (firstColon == -1 || !long.TryParse(storedData.AsSpan(firstColon + 1), out var expireTick)) {
            return Errors.InvalidRefreshToken();
        }

        if (timeProvider.GetUtcNow().Ticks > expireTick) {
            return Errors.ExpiredRefreshToken();
        }
        
        // compare the tokens.
        if (!storedData.AsSpan(0, firstColon).SequenceEqual(token)) {
            return Errors.InvalidRefreshToken();
        }

        return Result.Success();
    }
}