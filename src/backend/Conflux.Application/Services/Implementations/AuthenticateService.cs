using Conflux.Application.Core;
using Conflux.Application.Responses;
using Conflux.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Conflux.Application.Services.Implementations;

internal sealed class AuthenticateService(
    UserManager<ApplicationUser> userManager,
    IConfiguration config
) : IAuthenticateService {
    private const string ApplicationJwtLoginProvider = "AppJWT";

    public async Task<Result> Register(string email, string password) {
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

    public async Task<Result<LoginResponse>> Login(string email, string password) {
        var user = await userManager.FindByEmailAsync(email);
        
        if (user != null && await userManager.CheckPasswordAsync(user, password)) {
            GenerateJwtToken(user, out var accessToken, out var refreshToken, out long refreshTokenExpireTick);
            
            await userManager.SetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken", $"{refreshToken}:{refreshTokenExpireTick}");
            
            return Result<LoginResponse>.Success(new(user, "Bearer", accessToken, refreshToken));
        }

        return Result<LoginResponse>.Failure("Auth.InvalidCredentials", "Invalid credentials.");
    }
    
    private void GenerateJwtToken(ApplicationUser user, out string accessToken, out string refreshToken, out long refreshTokenExpireTick) {
        var claims = new Claim[] {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email!),
            new(JwtRegisteredClaimNames.Name, user.UserName!),
            new(JwtRegisteredClaimNames.EmailVerified, bool.FalseString),  // TODO: Email verification
            new("role", "user"),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            notBefore: null,
            expires: DateTime.Now.AddMinutes(15),
            signingCredentials: creds
        );

        accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        refreshToken = GenerateRefreshToken();
        refreshTokenExpireTick = DateTime.UtcNow.AddDays(7).Ticks;
    }
    
    private static string GenerateRefreshToken() {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public async Task<Result<RefreshResponse>> Refresh(string userEmail, string refreshToken) {
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
        GenerateJwtToken(user, out string newAccessToken, out string newRefreshToken, out long newRefreshTokenExpireTick);
        
        await userManager.SetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken", $"{newRefreshToken}:{newRefreshTokenExpireTick}");

        return Result<RefreshResponse>.Success(new(user, newAccessToken, newRefreshToken));
    }
}