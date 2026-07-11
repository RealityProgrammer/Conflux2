using Conflux.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthenticateController : ControllerBase {
    private readonly IAuthenticateService _authService;
    
    public AuthenticateController(IAuthenticateService authService) {
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
    public async Task<ActionResult> Login([FromBody] LoginRequest request) {
        var loginResult = await _authService.Login(request.Email, request.Password);
    
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
        
        SetRefreshTokenCookie(request.Email, response.RefreshToken);
    
        return Ok(new LoginResponse(response.TokenType, response.AccessToken));
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
    
    [HttpPost("register", Name = "Register")]
    public async Task<ActionResult> Register([FromBody] RegisterRequest request) {
        if (request.Password != request.ConfirmPassword) {
            return BadRequest(new RegisterResponse(
                "PasswordMismatch",
                "Passwords do not match."
            ));
        }
    
        var response = await _authService.Register(request.Email, request.Password);
    
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
    
            var result = await _authService.Refresh(email, refreshToken);
    
            if (!result.IsSuccess) {
                // we could return BadRequest when the error code is Auth.NoEmail, but it could be abused as
                // a user query mechanism.
                
                return Unauthorized();
            }
            
            SetRefreshTokenCookie(email, result.Value.RefreshToken);
            return Ok(new RefreshResponse(result.Value.AccessToken));
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
    
    // ReSharper disable NotAccessedPositionalProperty.Global
    public record LoginRequest(string Email, string Password);
    public record LoginResponse(string TokenType, string AccessToken);
    public record RegisterRequest(string Email, string Password, string ConfirmPassword);
    public record RegisterResponse(string Code, string Message);
    public record RefreshResponse(string AccessToken);
    // ReSharper restore NotAccessedPositionalProperty.Global
}
