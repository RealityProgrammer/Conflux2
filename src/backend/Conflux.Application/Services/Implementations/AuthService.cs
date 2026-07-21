using Conflux.Application.Responses;
using Conflux.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Collections.Specialized;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Web;

namespace Conflux.Application.Services.Implementations;

public class AuthServiceOptions {
    public int AccessTokenDuration { get; set; } = TimeSpan.FromMinutes(30).Seconds;
    public int RefreshTokenDuration { get; set; } = TimeSpan.FromDays(7).Seconds;
}

internal sealed class AuthService : IAuthService {
    private const string ApplicationJwtLoginProvider = "AppJWT";

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IMailingService _mailingService;
    private readonly IConfiguration _config;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<AuthService> _logger;
    
    private readonly AuthServiceOptions _options;

    public AuthService(
        UserManager<ApplicationUser> userManager, 
        IMailingService mailingService,
        TimeProvider timeProvider,
        IConfiguration config,
        ILogger<AuthService> logger,
        IOptions<AuthServiceOptions> options
    ) {
        _userManager = userManager;
        _mailingService = mailingService;
        _timeProvider = timeProvider;
        _logger = logger;
        _config = config;

        _options = options.Value;
    }
    
    public async Task<Result> RegisterAsync(string email, string password) {
        var userExists = await _userManager.FindByEmailAsync(email);
        
        if (userExists != null) {
            return Errors.InvalidCredentials();
        }

        var generatedUserName = $"User-{Guid.NewGuid():N}";

        ApplicationUser user = new ApplicationUser {
            Email = email,
            UserName = generatedUserName,
            DisplayName = generatedUserName,
        };
        
        var result = await _userManager.CreateAsync(user, password);
        
        if (!result.Succeeded) {
            var firstError = result.Errors.First();
            return Result.Failure(firstError.Code, firstError.Description);
        }

        return Result.Success();
    }

    public async Task<Result<LoginResponse>> LoginAsync(string email, string password) {
        var user = await _userManager.FindByEmailAsync(email);
        
        if (user != null && await _userManager.CheckPasswordAsync(user, password)) {
            IList<string> roles = await _userManager.GetRolesAsync(user);
            var token = await GenerateJwtToken(user, roles);
            
            await _userManager.SetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken", $"{token.RefreshToken}:{token.RefreshTokenExpireTick}");

            var permissions = await GetAuthorizationPermissions(user);
            
            return Result<LoginResponse>.Success(new(new(
                user.Id,
                user.EmailConfirmed,
                user.IsProfileSetup,
                roles.AsReadOnly(),
                permissions
            ), "Bearer", token.AccessToken, token.RefreshToken));
        }

        return Errors.InvalidCredentials();
    }
    
    private async Task<TokenResponse> GenerateJwtToken(ApplicationUser user, IEnumerable<string> roles) {
        var claims = new List<Claim> {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString("N")),
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

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var credential = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        DateTimeOffset accessTokenExpire = _timeProvider.GetUtcNow().AddSeconds(_options.AccessTokenDuration);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: accessTokenExpire.UtcDateTime,
            signingCredentials: credential
        );

        string accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        long accessTokenExpireTick = accessTokenExpire.Ticks;
        string refreshToken = GenerateRefreshToken();
        long refreshTokenExpireTick = DateTime.UtcNow.AddSeconds(_options.RefreshTokenDuration).Ticks;
        
        return new(accessToken, accessTokenExpireTick, refreshToken, refreshTokenExpireTick);
    }
    
    private static string GenerateRefreshToken() {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public async Task<Result<RefreshResponse>> RefreshAsync(string userEmail, string refreshToken) {
        var user = await _userManager.FindByEmailAsync(userEmail);
        if (user == null) {
            return Errors.NoUserFoundFromEmail();
        }
        
        var storedData = await _userManager.GetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken");
        if (string.IsNullOrEmpty(storedData)) {
            return Errors.InvalidRefreshToken();
        }
        
        int firstColon = storedData.IndexOf(':');
        
        // failure if somehow the data is corrupted or is expired.
        if (firstColon == -1 || !long.TryParse(storedData.AsSpan()[(firstColon + 1)..], out var expireTick) || DateTime.UtcNow.Ticks > expireTick) {
            return Errors.InvalidRefreshToken();
        }
        
        // compare the tokens.
        if (!storedData.AsSpan()[..firstColon].SequenceEqual(refreshToken)) {
            return Errors.InvalidRefreshToken();
        }
        
        // everything is fine now, rotate and store the new generated tokens.
        IList<string> roles = await _userManager.GetRolesAsync(user);
        var tokens = await GenerateJwtToken(user, roles);
        
        await _userManager.SetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken", $"{tokens.RefreshToken}:{tokens.RefreshTokenExpireTick}");

        var permissions = await GetAuthorizationPermissions(user);
        
        return Result<RefreshResponse>.Success(new(new(
            user.Id,
            user.EmailConfirmed,
            user.IsProfileSetup,
            roles.AsReadOnly(),
            permissions
        ), "Bearer", tokens.AccessToken, tokens.RefreshToken));
    }

    public async Task<Result<UserAuthorizationInfo?>> GetAuthorizationInfoAsync(string userId) {
        var user = await _userManager.FindByIdAsync(userId);

        if (user == null) {
            return Result<UserAuthorizationInfo?>.Failure(Errors.NoUserFoundFromId());
        }

        var userRoles = await _userManager.GetRolesAsync(user);
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
        var user = await _userManager.FindByIdAsync(userId);

        if (user == null) {
            return Errors.NoUserFoundFromId();
        }

        if (user.EmailConfirmed) {
            return Errors.UserAlreadyVerified();
        }
        
        // TODO: Time-limiting the confirmation token.

        string confirmCode = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        string encodedCode = Base64UrlEncoder.Encode(Encoding.UTF8.GetBytes(confirmCode));

        NameValueCollection queryArguments = HttpUtility.ParseQueryString(string.Empty);
        queryArguments.Add("userId", userId);
        queryArguments.Add("code", encodedCode);

        UriBuilder builder = new UriBuilder(_config["Frontend:Origin"] ?? throw new InvalidOperationException("Missing configuration of frontend origin at Frontend:Origin.")) {
            Path = "auth/confirm-email",
            Query = queryArguments.ToString(),
        };

        string redirectUrl = builder.Uri.ToString();

        return await _mailingService.SendEmailConfirmationAsync(user.Email!, redirectUrl);
    }

    public async Task<Result> ConfirmEmailAsync(string userId, string code) {
        var user = await _userManager.FindByIdAsync(userId);

        if (user == null) {
            return Errors.NoUserFoundFromId();
        }

        if (user.EmailConfirmed) {
            return Errors.UserAlreadyVerified();
        }
        
        var result = await _userManager.ConfirmEmailAsync(user, code);

        if (result.Succeeded) {
            return Result.Success();
        }

        var firstError = result.Errors.First();
        return Result.Failure(firstError.Code, firstError.Description);
    }

    private async Task<List<string>> GetAuthorizationPermissions(ApplicationUser user) {
        List<string> permissions = [];

        return permissions;
    }
}