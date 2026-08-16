using Conflux.Application.Dto.Responses;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Collections.Specialized;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Web;
using JwtRegisteredClaimNames = Microsoft.IdentityModel.JsonWebTokens.JwtRegisteredClaimNames;

namespace Conflux.Application.Services.Implementations;

public class AuthServiceOptions {
    public int AccessTokenDuration { get; set; } = TimeSpan.FromMinutes(30).Seconds;
    public int RefreshTokenDuration { get; set; } = TimeSpan.FromDays(7).Seconds;
}

internal sealed class AuthService(
    UserManager<ApplicationUser> userManager,
    IAuthRepository authRepository,
    IMailingService mailingService,
    TimeProvider timeProvider,
    IConfiguration config,
    IOptions<AuthServiceOptions> options
) : IAuthService {
    private readonly AuthServiceOptions _options = options.Value;

    public async Task<Result> RegisterAsync(string email, string password) {
        var result = await authRepository.RegisterAsync(email, password);

        if (result.IsSuccess) {
            return Result.Success();
        }

        return result;
    }

    public async Task<Result<LoginResponse>> LoginAsync(string email, string password) {
        var user = await authRepository.GetUserByLoginCredentialAsync(email, password);

        if (user != null) {
            IList<string> roles = await authRepository.GetUserRolesAsync(user);
                        
            GenerateAccessToken(user, roles, out string accessToken, out _);
            GenerateRefreshToken(out string refreshToken, out DateTimeOffset refreshTokenExpiration);

            var storeResult = await authRepository.StoresAuthenticationToken(user, refreshToken, refreshTokenExpiration);
            
            if (!storeResult.IsSuccess) {
                return storeResult.Error;
            }
            
            var permissions = await GetAuthorizationPermissions(user);

            return Result<LoginResponse>.Success(new(new(
                user.Id,
                user.EmailConfirmed,
                user.IsProfileSetup,
                roles.AsReadOnly(),
                permissions
            ), "Bearer", accessToken, refreshToken));
        }

        return Errors.InvalidCredentials();
    }
    
    private void GenerateAccessToken(ApplicationUser user, IEnumerable<string> roles, out string accessToken, out long expireTick) {
        var claims = new List<Claim> {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email!),
        };
        
        if (user.EmailConfirmed) {
            claims.Add(new(JwtRegisteredClaimNames.EmailVerified, "true"));
        }

        if (user.IsProfileSetup) {
            claims.Add(new("ProfileSetupComplete", "true"));
        }
        
        foreach (var role in roles) {
            claims.Add(new("role", role));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Secret"]!));
        var credential = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        DateTimeOffset accessTokenExpire = timeProvider.GetUtcNow().AddSeconds(_options.AccessTokenDuration);

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: accessTokenExpire.UtcDateTime,
            signingCredentials: credential
        );

        accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        expireTick = accessTokenExpire.Ticks;
    }
    
    private void GenerateRefreshToken(out string refreshToken, out DateTimeOffset expiration) {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        
        refreshToken = Convert.ToBase64String(randomNumber);
        expiration = timeProvider.GetUtcNow().AddSeconds(_options.RefreshTokenDuration);
    }

    public async Task<Result<RefreshResponse>> RefreshAsync(string userEmail, string refreshToken) {
        var user = await userManager.FindByEmailAsync(userEmail);
        if (user == null) {
            return Errors.NoUserFoundFromEmail();
        }

        var result = await authRepository.CheckAuthenticationToken(user, refreshToken);

        if (!result.IsSuccess) {
            return result.Error;
        }
        
        IList<string> roles = await authRepository.GetUserRolesAsync(user);
        GenerateAccessToken(user, roles, out string accessToken, out _);
        
        var permissions = await GetAuthorizationPermissions(user);
        
        return Result<RefreshResponse>.Success(new(new(
            user.Id,
            user.EmailConfirmed,
            user.IsProfileSetup,
            roles.AsReadOnly(),
            permissions
        ), "Bearer", accessToken));
    }

    public async Task<Result<UserAuthorizationInfo?>> GetAuthorizationInfoAsync(string userId) {
        var user = await userManager.FindByIdAsync(userId);

        if (user == null) {
            return Result<UserAuthorizationInfo?>.Failure(Errors.NoUserFoundFromId());
        }

        var userRoles = await authRepository.GetUserRolesAsync(user);
        var permissions = await GetAuthorizationPermissions(user);
        
        return Result<UserAuthorizationInfo?>.Success(new(
            user.Id,
            user.EmailConfirmed,
            user.IsProfileSetup,
            userRoles.AsReadOnly(), 
            permissions
        ));
    }

    public async Task<Result> SendVerificationEmailAsync(string userId) {
        var user = await userManager.FindByIdAsync(userId);

        if (user == null) {
            return Errors.NoUserFoundFromId();
        }

        if (user.EmailConfirmed) {
            return Errors.UserAlreadyVerified();
        }
        
        // TODO: Time-limiting the confirmation token.
        string confirmCode = await authRepository.GenerateEmailConfirmationCodeAsync(user);
        string encodedCode = Base64UrlEncoder.Encode(Encoding.UTF8.GetBytes(confirmCode));

        NameValueCollection queryArguments = HttpUtility.ParseQueryString(string.Empty);
        queryArguments.Add("userId", userId);
        queryArguments.Add("code", encodedCode);

        UriBuilder builder = new UriBuilder(config["Frontend:Origin"] ?? throw new InvalidOperationException("Missing configuration of frontend origin at Frontend:Origin.")) {
            Path = "auth/confirm-email",
            Query = queryArguments.ToString(),
        };

        string redirectUrl = builder.Uri.ToString();

        return await mailingService.SendEmailConfirmationAsync(user.Email!, redirectUrl);
    }

    public async Task<Result> ConfirmEmailAsync(string userId, string code) {
        var user = await userManager.FindByIdAsync(userId);

        if (user == null) {
            return Errors.NoUserFoundFromId();
        }

        if (user.EmailConfirmed) {
            return Errors.UserAlreadyVerified();
        }
        
        return await authRepository.ConfirmEmailAsync(user, code);
    }

    private async Task<List<string>> GetAuthorizationPermissions(ApplicationUser user) {
        List<string> permissions = [];

        return permissions;
    }
}