using Conflux.Application.Responses;
using Conflux.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthenticateController : ControllerBase {
    private readonly IAuthService _authService;
    
    public AuthenticateController(IAuthService authService) {
        _authService = authService;
    }

    [HttpGet("healthcheck", Name = "Healthcheck")]
    public ActionResult Healthcheck() {
        return Ok();
    }

    [HttpGet("authorized-healthcheck", Name = "AuthorizedHealthcheck")]
    [Authorize]
    public ActionResult AuthorizedHealthcheck() {
        return Ok();
    }

    [HttpPost("login", Name = "Login")]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult> Login([FromBody] LoginRequest request) {
        var loginResult = await _authService.LoginAsync(request.Email, request.Password);
    
        if (!loginResult.IsSuccess) {
            switch (loginResult.Error.Code) {
                case "Auth.InvalidCredentials":
                    return BadRequest();
                
                default:
                    // Unknown error code so we just gonna return random shit.
                    return BadRequest();
            }            
        }

        var response = loginResult.Value;

        SetAccessTokenCookie(response.AccessToken);
        SetRefreshTokenCookie(request.Email, response.RefreshToken);
    
        return Ok(new LoginResponse(response.AuthorizationInfo, response.TokenType, response.AccessToken));
    }

    private void SetAccessTokenCookie(string accessToken) {
        var cookieOptions = new CookieOptions {
            HttpOnly = true,                            // Prevent JavaScript access.
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,             // Prevent CSRF
            Expires = DateTime.UtcNow.AddMinutes(15),
        };

        // Attach the cookie to the response
        Response.Cookies.Append("X-Access-Token", accessToken, cookieOptions);
    }
    
    private void SetRefreshTokenCookie(string email, string refreshToken) {
        var payload = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{email}:{refreshToken}"));
        
        var cookieOptions = new CookieOptions {
            HttpOnly = true,                            // Prevent JavaScript access.
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,             // Prevent CSRF
            Expires = DateTime.UtcNow.AddDays(7),
        };
    
        Response.Cookies.Append("X-Refresh-Token", payload, cookieOptions);
    }
    
    [HttpPost("register", Name = "Register")]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult> Register([FromBody] RegisterRequest request) {
        if (request.Password != request.ConfirmPassword) {
            return BadRequest(new RegisterResponse(
                "PasswordMismatch",
                "Passwords do not match."
            ));
        }
        
        var response = await _authService.RegisterAsync(request.Email, request.Password);
    
        if (response.IsSuccess) {
            return Created();
        }
    
        return BadRequest(new RegisterResponse(response.Error.Code, response.Error.Message));
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
            string refreshToken = decodedPayload[(firstColon + 1)..];
    
            var result = await _authService.RefreshAsync(email, refreshToken);
    
            if (!result.IsSuccess) {
                // we could return BadRequest when the error code is Auth.NoEmail, but it could be abused as
                // a user query mechanism.
                
                return Unauthorized();
            }

            var value = result.Value;
            
            SetAccessTokenCookie(value.AccessToken);
            SetRefreshTokenCookie(email, value.RefreshToken);
            
            return Ok(new RefreshResponse(value.AuthorizationInfo, value.TokenType, value.AccessToken));
        } catch {
            return Unauthorized();
        }
    }
    
    [HttpPost("logout")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult> Logout() {
        Response.Cookies.Delete("X-Access-Token", new() {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,
        });
        
        Response.Cookies.Delete("X-Refresh-Token", new() {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,
        });
        
        return Ok();
    }

    [HttpGet("authorization-info")]
    [Authorize]
    public async Task<ActionResult<UserAuthorizationInfo>> GetUserInfo() {
        var nameIdentifier = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        if (string.IsNullOrEmpty(nameIdentifier)) {
            return Unauthorized();
        }
        
        var info = await _authService.GetAuthorizationInfoAsync(nameIdentifier);

        if (!info.IsSuccess) {
            return Unauthorized();
        }

        return Ok(info);
    }

    [HttpPost("send-verify-email")] // Post to use the antiforgery token.
    [Authorize]
    public async Task<ActionResult> SendVerifyEmail() {
        var nameIdentifier = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        if (string.IsNullOrEmpty(nameIdentifier)) {
            return Unauthorized();
        }

        var result = await _authService.SendVerificationEmailAsync(nameIdentifier);
        
        return result.IsSuccess ? 
            Ok() : 
            StatusCode(StatusCodes.Status502BadGateway);    // TODO: Figure out a better status code representing email failure.
    }
    
    // ReSharper disable NotAccessedPositionalProperty.Global
    public record LoginRequest(string Email, string Password);
    public record LoginResponse(UserAuthorizationInfo Authorization, string TokenType, string AccessToken);
    public record RegisterRequest(string Email, string Password, string ConfirmPassword);
    public record RegisterResponse(string Code, string Message);
    public record RefreshResponse(UserAuthorizationInfo Authorization, string TokenType, string AccessToken);
    // ReSharper restore NotAccessedPositionalProperty.Global
}
