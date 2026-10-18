using Conflux.Application.Dto;
using Conflux.Application.Features.Identity;
using Conflux.Application.Features.Users;
using Conflux.Application.Options;
using Conflux.Domain;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[Authorize, ApiController, Route("api/auth")]
public sealed class AuthenticateController(
    ISender sender,
    TimeProvider timeProvider,
    IOptions<AuthOptions> options,
    ILogger<AuthenticateController> logger
) : ControllerBase {
    private readonly AuthOptions _authOptions = options.Value;
    
    [AllowAnonymous, HttpPost("login", Name = "Login"), IgnoreAntiforgeryToken]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login([FromBody] LoginRequest request) {
        var userAgent = Request.Headers.UserAgent.ToString();
        var finalUserAgent = string.IsNullOrEmpty(userAgent) ? "Unknown Device" : userAgent;
        
        var loginResult = await sender.Send(new LoginCommand(request.Email, request.Password, finalUserAgent));
    
        if (!loginResult.IsSuccess) {
            return loginResult.Error.Code switch {
                nameof(Errors.InvalidCredentials) => BadRequest(new ApiResponse<LoginResponse>(null, Errors.InvalidCredentials())),
                _ => BadRequest(new ApiResponse<LoginResponse>(null, Errors.UnexpectedError())),
            };
        }

        var response = loginResult.Value;

        SetAccessTokenCookie(response!.AccessToken);
        SetRefreshTokenCookie(request.Email, response!.SessionId, response.RefreshToken);
    
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
            Expires = timeProvider.GetUtcNow().AddSeconds(_authOptions.AccessTokenDuration),
        };

        // Attach the cookie to the response
        Response.Cookies.Append("X-Access-Token", accessToken, cookieOptions);
    }
    
    private void SetRefreshTokenCookie(string email, Guid sessionId, string refreshToken) {
        var payload = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{email}:{sessionId}:{refreshToken}"));
        
        var cookieOptions = new CookieOptions {
            HttpOnly = true,                            // Prevent JavaScript access.
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,             // Prevent CSRF
            Expires = timeProvider.GetUtcNow().AddSeconds(_authOptions.RefreshTokenDuration),
        };

        Response.Cookies.Append("X-Refresh-Token", payload, cookieOptions);
    }
    
    [AllowAnonymous, HttpPost("register", Name = "Register"), IgnoreAntiforgeryToken]
    public async Task<ActionResult<ApiResponse>> Register([FromBody] RegisterRequest request) {
        if (request.Password != request.ConfirmPassword) {
            return BadRequest(new ApiResponse(Errors.ValidationErrorsOccurred(new() {
                ["confirmPassword"] = ["Passwords are mismatch."],
            })));
        }
        
        var response = await sender.Send(new RegisterCommand(request.Email, request.Password));
    
        if (response.IsSuccess) {
            return Created();
        }
    
        return BadRequest(new ApiResponse(response.Error));
    }
    
    [AllowAnonymous, HttpPost("refresh"), IgnoreAntiforgeryToken]
    public async Task<ActionResult<ApiResponse<RefreshResponse>>> Refresh() {
        if (!Request.Cookies.TryGetValue("X-Refresh-Token", out var cookiePayload)) {
            return Unauthorized(new ApiResponse<RefreshResponse>(null, Errors.InvalidRefreshToken()));
        }

        string decodedPayload;

        try {
            decodedPayload = Encoding.UTF8.GetString(Convert.FromBase64String(cookiePayload));
        } catch {
            return Unauthorized(new ApiResponse<RefreshResponse>(null, Errors.InvalidRefreshToken()));
        }
        
        if (
            decodedPayload.Split(':', 3) is not { Length: 3 } parts || 
            !Guid.TryParse(parts[1], out Guid sessionId)
        ) {
            return Unauthorized(new ApiResponse<RefreshResponse>(null, Errors.InvalidRefreshToken()));
        }

        string email = parts[0];
        string refreshToken = parts[2];

        var result = await sender.Send(new RefreshCommand(email, sessionId, refreshToken));
        
        if (!result.IsSuccess) {
            // we could return BadRequest user is not found, but it could be abused as a user query mechanism.
            return Unauthorized(new ApiResponse<RefreshResponse>(null, Errors.InvalidCredentials()));
        }
        
        RefreshResponse value = result.Value!;
        
        SetAccessTokenCookie(value.AccessToken);
        
        return Ok(new ApiResponse<RefreshResponse>(
            new(value.AuthorizationInfo, value.TokenType, value.AccessToken), 
            Error.None
        ));
    }
    
    [HttpPost("logout"), IgnoreAntiforgeryToken]
    public async Task<ActionResult> Logout() {
        if (Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out Guid userId) && Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Jti), out Guid sessionId)) {
            await sender.Send(new LogoutCommand(userId, sessionId));
        }
        
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

    [HttpPost("logout-all"), IgnoreAntiforgeryToken]
    public async Task<ActionResult> LogoutAll() {
        if (Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out Guid userId)) {
            await sender.Send(new LogoutAllCommand(userId));
        }
        
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
    public async Task<ActionResult<ApiResponse<UserAuthorizationInfo>>> GetAuthorizationInfo() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim)) {
            return Unauthorized(new ApiResponse<UserAuthorizationInfo>(null, Errors.InvalidCredentials()));
        }
        
        var info = await sender.Send(new GetUserAuthorizationInfoQuery(idClaim));

        if (!info.IsSuccess) {
            return Unauthorized(new ApiResponse<UserAuthorizationInfo>(null, Errors.InvalidCredentials()));
        }
        
        return Ok(new ApiResponse<UserAuthorizationInfo>(info.Value, Error.None));
    }

    [HttpPost("resend-confirm-email")]
    public async Task<ActionResult<ApiResponse>> SendVerifyEmail() {
        if (!Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out Guid userId)) {
            return Unauthorized(new ApiResponse(Errors.InvalidCredentials()));
        }

        var result = await sender.Send(new ResendConfirmationEmailCommand(userId));

        if (result.IsSuccess) {
            return Ok();
        }

        switch (result.Error.Code) {
            case nameof(Errors.NoUserFoundFromId):
                return BadRequest(new ApiResponse(result.Error));
            
            case nameof(Errors.UserAlreadyVerified):
                return Ok();
            
            default:
                logger.LogError("Error while sending verification email: {e}", result.Error);
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new ApiResponse(Errors.UnexpectedError()));
        }
    }

    [HttpPost("confirm-email"), AllowAnonymous]
    public async Task<ActionResult<ApiResponse>> ConfirmEmail([FromBody] ConfirmEmailRequest request) {
        var result = await sender.Send(new ConfirmEmailCommand(request.UserId, request.ConfirmationCode));
        
        if (result.IsSuccess) {
            return Ok();
        }

        switch (result.Error.Code) {
            case nameof(Errors.NoUserFoundFromId) or nameof(Errors.InvalidConfirmationCode):
                return BadRequest(new ApiResponse(result.Error));

            case nameof(Errors.UserAlreadyVerified):
                return Ok();
            
            default:
                logger.LogWarning("Error while confirming email: {e}", result.Error);
                return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(Errors.UnexpectedError()));
        }
    }
    
    // ReSharper disable NotAccessedPositionalProperty.Global
    public sealed record LoginRequest(
        [Required, EmailAddress] string Email,
        [Required, DataType(DataType.Password)] string Password
    );
    
    public sealed record LoginResponse(UserAuthorizationInfo Authorization, string TokenType, string AccessToken);
    
    public sealed record RegisterRequest(
        [Required, EmailAddress] string Email, 
        [Required, DataType(DataType.Password)] string Password,
        [Required, DataType(DataType.Password)] string ConfirmPassword
    );
    // ReSharper restore NotAccessedPositionalProperty.Global

    public sealed record ConfirmEmailRequest(string UserId, string ConfirmationCode);
}
