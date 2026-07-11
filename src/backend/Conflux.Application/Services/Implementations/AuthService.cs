using Conflux.Application.Responses;
using Conflux.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;

namespace Conflux.Application.Services.Implementations;

internal sealed class AuthService(
    UserManager<ApplicationUser> userManager,
    IConfiguration config
) : IAuthService {
    private const string ApplicationJwtLoginProvider = "AppJWT";

    public async Task<Result> RegisterAsync(string email, string password) {
        var userExists = await userManager.FindByEmailAsync(email);
        
        if (userExists != null) {
            return Result.Failure("Auth.OccupiedIdentity", "User email is already in used.");
        }

        ApplicationUser user = new ApplicationUser {
            UserName = email,
            Email = email,
        };
        
        var result = await userManager.CreateAsync(user, password);
        
        if (!result.Succeeded) {
            var firstError = result.Errors.First();
            return Result.Failure(firstError.Code, firstError.Description);
        }

        return Result.Success();
    }

    public async Task<Result<LoginResponse>> LoginAsync(string email, string password) {
        var user = await userManager.FindByEmailAsync(email);
        
        if (user != null && await userManager.CheckPasswordAsync(user, password)) {
            IList<string> roles = await userManager.GetRolesAsync(user);
            var token = await GenerateJwtToken(user, roles);
            
            await userManager.SetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken", $"{token.RefreshToken}:{token.RefreshTokenExpireTick}");
            
            var permissions = await GetAuthorizationPermissions(user);
            
            return Result<LoginResponse>.Success(new(new(
                user.UserName!,
                roles.AsReadOnly(),
                permissions
            ), "Bearer", token.AccessToken, token.RefreshToken));
        }

        return Result<LoginResponse>.Failure("Auth.InvalidCredentials", "Invalid credentials.");
    }
    
    private async Task<TokenResponse> GenerateJwtToken(ApplicationUser user, IEnumerable<string> roles) {
        var claims = new List<Claim> {
            new(ClaimTypes.NameIdentifier, user.Id.ToString("N")),
            new(ClaimTypes.Email, user.Email!),
        };

        foreach (var role in roles) {
            claims.Add(new("role", role));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
        var credential = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        DateTime accessTokenExpire = DateTime.Now.AddMinutes(15);

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            notBefore: null,
            expires: accessTokenExpire,
            signingCredentials: credential
        );

        string accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        long accessTokenExpireTick = accessTokenExpire.Ticks;
        string refreshToken = GenerateRefreshToken();
        long refreshTokenExpireTick = DateTime.UtcNow.AddDays(7).Ticks;

        return new(accessToken, accessTokenExpireTick, refreshToken, refreshTokenExpireTick);
    }
    
    private static string GenerateRefreshToken() {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public async Task<Result<RefreshResponse>> RefreshAsync(string userEmail, string refreshToken) {
        var user = await userManager.FindByEmailAsync(userEmail);
        if (user == null) {
            return Result<RefreshResponse>.Failure("Auth.NoEmail", "No user with the provided email.");
        }
        
        var storedData = await userManager.GetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken");
        if (string.IsNullOrEmpty(storedData)) {
            return Result<RefreshResponse>.Failure("Auth.NoRefreshToken", "User has no valid refresh token.");
        }
        
        int firstColon = storedData.IndexOf(':');

        // failure if somehow the data is corrupted or is expired.
        if (firstColon == -1 || !long.TryParse(storedData.AsSpan()[(firstColon + 1)..], out var expireTick) || DateTime.UtcNow.Ticks > expireTick) {
            return Result<RefreshResponse>.Failure(new("Auth.NoRefreshToken", "User has no valid refresh token."));
        }

        // compare the tokens.
        if (storedData.AsSpan()[..firstColon] != refreshToken) {
            return Result<RefreshResponse>.Failure("Auth.InvalidRefreshToken", "Invalid refresh token.");
        }
        
        // everything is fine now, rotate and store the new generated tokens.
        IList<string> roles = await userManager.GetRolesAsync(user);
        var tokens = await GenerateJwtToken(user, roles);
        
        await userManager.SetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken", $"{tokens.RefreshToken}:{tokens.RefreshTokenExpireTick}");

        var permissions = await GetAuthorizationPermissions(user);
        
        return Result<RefreshResponse>.Success(new(new(
            user.UserName!,
            roles.AsReadOnly(),
            permissions
        ), "Bearer", tokens.AccessToken, tokens.RefreshToken));
    }

    public async Task<UserAuthorizationInfo?> GetAuthorizationInfoAsync(Guid userId) {
        // TODO: Reduce string allocation.
        return await GetAuthorizationInfoAsync(userId.ToString());
    }
    
    public async Task<UserAuthorizationInfo?> GetAuthorizationInfoAsync(string userId) {
        var user = await userManager.FindByIdAsync(userId);

        if (user == null) {
            return null;
        }

        var userRoles = await userManager.GetRolesAsync(user);
        var permissions = await GetAuthorizationPermissions(user);
        
        return new(user.UserName!, userRoles.AsReadOnly(), permissions);
    }

    private async Task<List<string>> GetAuthorizationPermissions(ApplicationUser user) {
        List<string> permissions = [];

        if (user.EmailConfirmed) {
            permissions.Add("EMAIL_CONFIRMED");
        }

        return permissions;
    }
}