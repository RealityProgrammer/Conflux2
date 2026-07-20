using Conflux.Application;
using Conflux.Application.Responses;
using Conflux.Application.Services;
using Conflux.Application.Services.Implementations;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthenticateController : ControllerBase {
    private readonly IAuthService _authService;
    private readonly AuthServiceOptions _options;
    private readonly TimeProvider _timeProvider;
    private readonly IAntiforgery _antiforgery;
    private readonly ILogger<AuthenticateController> _logger;
    
    public AuthenticateController(
        IAuthService authService, 
        TimeProvider timeProvider,
        IAntiforgery antiforgery,
        IOptions<AuthServiceOptions> options,
        ILogger<AuthenticateController> logger
    ) {
        _authService = authService;
        _timeProvider = timeProvider;
        _antiforgery = antiforgery;
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
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login([FromBody] LoginRequest request) {
        var loginResult = await _authService.LoginAsync(request.Email, request.Password);
    
        if (!loginResult.IsSuccess) {
            return loginResult.Error.Code switch {
                nameof(Errors.InvalidCredentials) => BadRequest(new ApiResponse<LoginResponse>(null, Errors.InvalidCredentials())),
                _ => BadRequest(new ApiResponse<LoginResponse>(null, Errors.UnexpectedError())),
            };
        }

        var response = loginResult.Value;

        SetAccessTokenCookie(response.AccessToken);
        SetRefreshTokenCookie(request.Email, response.RefreshToken);
    
        return Ok(new ApiResponse<LoginResponse>(
            new(response.AuthorizationInfo, response.TokenType, response.AccessToken),
            Error.None
        ));
    }

    private void SetAccessTokenCookie(string accessToken) {
        var cookieOptions = new CookieOptions {
            HttpOnly = true,                            // Prevent JavaScript access.
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,             // Prevent CSRF
            Expires = _timeProvider.GetUtcNow().AddSeconds(_options.AccessTokenDuration),
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
            Expires = _timeProvider.GetUtcNow().AddSeconds(_options.RefreshTokenDuration),
        };
    
        Response.Cookies.Append("X-Refresh-Token", payload, cookieOptions);
    }
    
    [HttpPost("register", Name = "Register")]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<ApiResponse>> Register([FromBody] RegisterRequest request) {
        if (request.Password != request.ConfirmPassword) {
            return BadRequest(new ApiResponse(Errors.MismatchPasswords()));
        }
        
        var response = await _authService.RegisterAsync(request.Email, request.Password);
    
        if (response.IsSuccess) {
            return Created();
        }
    
        return BadRequest(new ApiResponse(response.Error));
    }
    
    [HttpPost("refresh")]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<ApiResponse<RefreshResponse>>> Refresh() {
        if (!Request.Cookies.TryGetValue("X-Refresh-Token", out var cookiePayload)) {
            return Unauthorized(new ApiResponse<RefreshResponse>(null, Errors.InvalidRefreshToken()));
        }
        
        var decodedPayload = Encoding.UTF8.GetString(Convert.FromBase64String(cookiePayload));
        int firstColon = decodedPayload.IndexOf(':');

        string email = decodedPayload[..firstColon];
        string refreshToken = decodedPayload[(firstColon + 1)..];

        var result = await _authService.RefreshAsync(email, refreshToken);

        if (!result.IsSuccess) {
            // we could return BadRequest when the error code is Auth.NoEmail, but it could be abused as
            // a user query mechanism.
            return Unauthorized(new ApiResponse<RefreshResponse>(null, Errors.InvalidCredentials()));
        }

        var value = result.Value;
        
        SetAccessTokenCookie(value.AccessToken);
        SetRefreshTokenCookie(email, value.RefreshToken);
        
        return Ok(new ApiResponse<RefreshResponse>(
            new(value.AuthorizationInfo, value.TokenType, value.AccessToken), 
            Error.None
        ));
    }
    
    [HttpPost("logout")]
    [Authorize]
    [IgnoreAntiforgeryToken]
    public async Task<ActionResult<ApiResponse>> Logout() {
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
    public async Task<ActionResult<ApiResponse<UserAuthorizationInfo>>> GetAuthorizationInfo() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim)) {
            return Unauthorized(new ApiResponse<UserAuthorizationInfo>(null, Errors.InvalidCredentials()));
        }
        
        var info = await _authService.GetAuthorizationInfoAsync(idClaim);

        if (!info.IsSuccess) {
            return Unauthorized(new ApiResponse<UserAuthorizationInfo>(null, Errors.InvalidCredentials()));
        }
        
        return Ok(new ApiResponse<UserAuthorizationInfo>(info.Value, Error.None));
    }

    [HttpPost("send-verify-email")] // Post to use the antiforgery token.
    [Authorize]
    public async Task<ActionResult<ApiResponse>> SendVerifyEmail() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim)) {
            return Unauthorized(new ApiResponse(Errors.InvalidCredentials()));
        }

        var result = await _authService.SendVerificationEmailAsync(idClaim);

        if (result.IsSuccess) {
            return Ok();
        }

        switch (result.Error.Code) {
            case nameof(Errors.NoUserFoundFromId):
                return BadRequest(new ApiResponse(result.Error));
            
            case nameof(Errors.UserAlreadyVerified):
                return Ok();
            
            default:
                _logger.LogError("Error while sending verification email: {e}", result.Error);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new ApiResponse(Errors.UnexpectedError()));
        }
    }

    [HttpPost("confirm-email")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse>> ConfirmEmail([FromBody] ConfirmEmailRequest request) {
        var result = await _authService.ConfirmEmailAsync(request.UserId, request.ConfirmationCode);
        
        if (result.IsSuccess) {
            return Ok();
        }

        switch (result.Error.Code) {
            case nameof(Errors.NoUserFoundFromId) or nameof(Errors.InvalidConfirmationCode):
                return BadRequest(new ApiResponse(result.Error));

            case nameof(Errors.UserAlreadyVerified):
                return Ok();
            
            default:
                _logger.LogWarning("Error while sending verification email: {e}", result.Error);
                return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(Errors.UnexpectedError()));
        }
    }
    
    // ReSharper disable NotAccessedPositionalProperty.Global
    public record LoginRequest(
        [Required, EmailAddress] string Email,
        [Required, DataType(DataType.Password)] string Password
    );
    
    public record LoginResponse(UserAuthorizationInfo Authorization, string TokenType, string AccessToken);
    
    public record RegisterRequest(
        [Required, EmailAddress] string Email, 
        [Required, DataType(DataType.Password)] string Password,
        [Required, DataType(DataType.Password)] string ConfirmPassword
    );
    
    public record RefreshResponse(UserAuthorizationInfo Authorization, string TokenType, string AccessToken);
    
    public record ConfirmEmailRequest(
        [Required] string UserId, 
        [Required] string ConfirmationCode
    );
    // ReSharper restore NotAccessedPositionalProperty.Global
}
