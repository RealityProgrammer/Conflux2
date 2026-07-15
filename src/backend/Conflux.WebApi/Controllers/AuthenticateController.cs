using Conflux.Application.Responses;
using Conflux.Application.Services;
using Conflux.Application.Services.Implementations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthenticateController : ControllerBase {
    private readonly IAuthService _authService;
    private readonly AuthServiceOptions _options;
    private readonly ILogger<AuthenticateController> _logger;
    
    public AuthenticateController(
        IAuthService authService, 
        IOptions<AuthServiceOptions> options,
        ILogger<AuthenticateController> logger
    ) {
        _authService = authService;
        _options = options.Value;
        _logger = logger;
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
            Expires = DateTime.UtcNow.AddSeconds(_options.AccessTokenDuration),
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
            Expires = DateTime.UtcNow.AddSeconds(_options.RefreshTokenDuration),
        };
    
        Response.Cookies.Append("X-Refresh-Token", payload, cookieOptions);
    }
    
    [HttpPost("register", Name = "Register")]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult> Register([FromBody] RegisterRequest request) {
        var response = await _authService.RegisterAsync(request.Email, request.Password);
    
        if (response.IsSuccess) {
            return Created();
        }
    
        return BadRequest(new RegisterResponse(response.Error.Code, response.Error.Message));
    }
    
    [HttpPost("refresh")]
    [IgnoreAntiforgeryToken]
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
        
        return Ok(info.Value);
    }

    [HttpPost("send-verify-email")] // Post to use the antiforgery token.
    public async Task<ActionResult> SendVerifyEmail() {
        var nameIdentifier = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        if (string.IsNullOrEmpty(nameIdentifier)) {
            return Unauthorized();
        }

        var result = await _authService.SendVerificationEmailAsync(nameIdentifier);

        if (result.IsSuccess) {
            return Ok();
        }

        switch (result.Error.Code) {
            case "Auth.NoId":
                return BadRequest();
            
            case "Auth.AlreadyConfirmed":
                return Ok();
            
            case var _ when result.Error.Code.StartsWith("Mail."):
                return StatusCode(StatusCodes.Status503ServiceUnavailable);
                
            default:
                _logger.LogWarning("Unhandled result error {e} when sending verify email.", result.Error);
                return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }

    [HttpPost("confirm-email")]
    [AllowAnonymous]
    public async Task<ActionResult> ConfirmEmail([FromBody] ConfirmEmailRequest request) {
        var result = await _authService.ConfirmEmailAsync(request.UserId, request.ConfirmationCode);
        
        if (result.IsSuccess) {
            return Ok();
        }

        switch (result.Error.Code) {
            case "Auth.NoId" or "Auth.InvalidConfirmCode":
                return BadRequest();

            case "Auth.AlreadyConfirmed":
                return Ok();
            
            case var _ when result.Error.Code.StartsWith("Auth."):
                // TODO: Better reporting.
                return StatusCode(StatusCodes.Status500InternalServerError);

            default:
                _logger.LogWarning("Unhandled result error {e} when confirm email.", result.Error);
                return StatusCode(StatusCodes.Status500InternalServerError);
        }
    }
    
    // ReSharper disable NotAccessedPositionalProperty.Global
    public record LoginRequest(
        [Required, EmailAddress] string Email,
        [Required, DataType(DataType.Password)] string Password
    );
    
    public record LoginResponse(
        UserAuthorizationInfo Authorization, 
        string TokenType, 
        string AccessToken
    );
    
    public record RegisterRequest(
        [Required, EmailAddress] string Email, 
        [Required, DataType(DataType.Password)] string Password,
        
        [Required, DataType(DataType.Password)]
        [property: Compare("Password", ErrorMessage = "Passwords do not match.")]
        string ConfirmPassword
    );
    
    public record RegisterResponse(
        string Code,
        string Message
    );
    
    public record RefreshResponse(UserAuthorizationInfo Authorization, string TokenType, string AccessToken);
    
    public record ConfirmEmailRequest(
        [Required] string UserId, 
        [Required] string ConfirmationCode
    );
    // ReSharper restore NotAccessedPositionalProperty.Global
}
