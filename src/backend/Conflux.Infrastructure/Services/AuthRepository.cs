using Conflux.Domain;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Infrastructure.Services;

public sealed class AuthRepository(
    UserManager<ApplicationUser> userManager,
    TimeProvider timeProvider
) : IAuthRepository {
    private const string ApplicationJwtLoginProvider = "AppJWT";
    
    public async Task<Result<ApplicationUser>> RegisterAsync(string email, string password) {
        var generatedUserName = $"User-{Guid.NewGuid():N}";
        
        ApplicationUser user = new ApplicationUser {
            Email = email,
            UserName = generatedUserName,
            DisplayName = generatedUserName,
        };
        var result = await userManager.CreateAsync(user, password);
        
        if (!result.Succeeded) {
            bool hasDuplicateEmail = result.Errors.Any(r => r.Code == nameof(IdentityErrorDescriber.DuplicateEmail));

            if (hasDuplicateEmail) {
                return Errors.EmailAttachedToAccount();
            }
            
            var firstError = result.Errors.First();
            return Result<ApplicationUser>.Failure(firstError.Code, firstError.Description);
        }
        
        return Result<ApplicationUser>.Success(user);
    }

    public async Task<ApplicationUser?> GetUserByLoginCredentialAsync(string email, string password) {
        var user = await userManager.FindByEmailAsync(email);

        return user != null && await userManager.CheckPasswordAsync(user, password) ? user : null;
    }

    public async Task<string> GenerateEmailConfirmationCodeAsync(ApplicationUser user) {
        return await userManager.GenerateEmailConfirmationTokenAsync(user);
    }

    public async Task<Result> ConfirmEmailAsync(ApplicationUser user, string token) {
        IdentityResult result = await userManager.ConfirmEmailAsync(user, token);
        
        if (result.Succeeded) {
            return Result.Success();
        }

        var firstError = result.Errors.First();
        return Result.Failure(firstError.Code, firstError.Description);
    }

    public async Task<IList<string>> GetUserRolesAsync(ApplicationUser user) {
        return await userManager.GetRolesAsync(user);
    }

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