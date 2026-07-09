using Conflux.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Conflux.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthenticateController : ControllerBase {
    private const string ApplicationJwtLoginProvider = "AppJWT";

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _config;

    public AuthenticateController(
        UserManager<ApplicationUser> userManager,
        IConfiguration config
    ) {
        _userManager = userManager;
        _config = config;
    }

    [HttpGet("health", Name = "Healthcheck")]
    public ActionResult Healthcheck() {
        return Ok();
    }

    [Authorize]
    [HttpGet("authorized-health", Name = "Authorized Healthcheck")]
    public ActionResult AuthorizedHealthcheck() {
        return Ok();
    }

    [HttpPost("login", Name = "Login")]
    public async Task<ActionResult> Login([FromBody] LoginRequest request) {
        var user = await _userManager.FindByEmailAsync(request.Email);

        if (user != null && await _userManager.CheckPasswordAsync(user, request.Password)) {
            GenerateJwtToken(user, out string accessToken, out string refreshToken, out long refreshTokenExpireTick);
            
            await _userManager.SetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken", $"{refreshToken}:{refreshTokenExpireTick}");
            SetRefreshTokenCookie(user.Email!, refreshToken);

            return Ok(new LoginResponse(accessToken));
        }
        
        return Unauthorized();
    }

    private void GenerateJwtToken(ApplicationUser user, out string accessToken, out string refreshToken, out long refreshTokenExpireTick) {
        var claims = new Claim[] {
            new(JwtRegisteredClaimNames.Sub, user.UserName!), new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            notBefore: null,
            expires: DateTime.Now.AddMinutes(15),
            signingCredentials: creds
        );

        accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        refreshToken = GenerateRefreshToken();
        refreshTokenExpireTick = DateTime.UtcNow.AddDays(7).Ticks;
    }

    private void SetRefreshTokenCookie(string email, string refreshToken) {
        var payload = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{email}:{refreshToken}"));
        
        var cookieOptions = new CookieOptions {
            HttpOnly = true,                            // Prevent JavaScript access.
            Secure = false,                             // TODO: Replace this with true once we got HTTPS
            SameSite = SameSiteMode.Strict,             // Prevent CSRF
            Expires = DateTime.UtcNow.AddDays(7),
        };

        Response.Cookies.Append("X-Refresh-Token", payload, cookieOptions);
    }

    private static string GenerateRefreshToken() {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    [HttpPost("register", Name = "Register")]
    public async Task<ActionResult> Register([FromBody] RegisterRequest request) {
        if (request.Password != request.ConfirmPassword) {
            return BadRequest(new RegisterResponse(
                "PasswordMismatch",
                "Passwords do not match."
            ));
        }
        
        var userExists = await _userManager.FindByEmailAsync(request.Email);
        if (userExists != null) {
            return BadRequest(new RegisterResponse(
                "OccupiedIdentity",
                "Email is already registered."
            ));
        }

        ApplicationUser user = new ApplicationUser {
            UserName = request.Email,
            Email = request.Email,
        };
        
        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded) {
            var firstError = result.Errors.First();
            return BadRequest(new RegisterResponse(firstError.Code, firstError.Description));
        }

        return Created();
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh() {
        if (!Request.Cookies.TryGetValue("X-Refresh-Token", out var cookiePayload)) {
            return Unauthorized();
        }

        try {
            var decodedPayload = Encoding.UTF8.GetString(Convert.FromBase64String(cookiePayload));
            int firstColon = decodedPayload.IndexOf(':');

            string email = decodedPayload[..firstColon];
            string token = decodedPayload[(firstColon + 1)..];

            var user = await _userManager.FindByEmailAsync(email);
            if (user == null) {
                return Unauthorized();
            }

            var storedData = await _userManager.GetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken");
            if (string.IsNullOrEmpty(storedData)) return Unauthorized();

            firstColon = storedData.IndexOf(':');

            // Force login if somehow the data is corrupted.
            if (firstColon == -1 || !long.TryParse(storedData.AsSpan()[(firstColon + 1)..], out var expireTick)) {
                return Unauthorized();
            }

            ReadOnlySpan<char> storedToken = storedData.AsSpan()[..firstColon];

            if (!storedToken.SequenceEqual(token) || DateTime.UtcNow.Ticks > expireTick) {
                return Unauthorized();
            }

            GenerateJwtToken(user, out string newAccessToken, out string newRefreshToken, out long newRefreshTokenExpireTick);

            await _userManager.SetAuthenticationTokenAsync(user, ApplicationJwtLoginProvider, "RefreshToken", $"{newRefreshToken}:{newRefreshTokenExpireTick}");

            SetRefreshTokenCookie(user.Email!, newRefreshToken);
            
            return Ok(new RefreshResponse(newAccessToken));
        } catch {
            return Unauthorized();
        }
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult> Logout() {
        Response.Cookies.Delete("X-Refresh-Token", new() {
            HttpOnly = true,
            Secure = false,                     // TODO: Replace this with true once we got HTTPS
            SameSite = SameSiteMode.Strict,
        });
        
        return Ok();
    }
    
    public record LoginRequest(string Email, string Password);
    public record LoginResponse(string AccessToken);
    public record RegisterRequest(string Email, string Password, string ConfirmPassword);
    public record RegisterResponse(string Code, string Message);
    public record RefreshResponse(string AccessToken);
}