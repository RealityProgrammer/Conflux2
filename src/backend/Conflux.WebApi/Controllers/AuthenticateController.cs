using Conflux.Application.Dto;
using Conflux.Application.Features.Identity;
using Conflux.Application.Features.Users;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.WebApi.Attributes;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[Authorize, ApiController, Route("api/auth")]
public sealed class AuthenticateController(
    ISender sender,
    ILogger<AuthenticateController> logger
) : ControllerBase {
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

        SetAccessTokenCookie(response!.AccessToken, response.AccessTokenExpireAt);
        SetRefreshTokenCookie(response.AuthorizationInfo.Id, response.SessionId, response.RefreshToken, response.RefreshTokenExpireAt);
    
        return Ok(new ApiResponse<LoginResponse>(
            new(response.AuthorizationInfo, response.TokenType, response.AccessToken),
            Error.None
        ));
    }

    private void SetAccessTokenCookie(string accessToken, DateTimeOffset expireAt) {
        var cookieOptions = new CookieOptions {
            HttpOnly = true,                            // Prevent JavaScript access.
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,             // Prevent CSRF
            Expires = expireAt,
        };

        // Attach the cookie to the response
        Response.Cookies.Append("X-Access-Token", accessToken, cookieOptions);
    }
    
    private void SetRefreshTokenCookie(Guid userId, Guid sessionId, string refreshToken, DateTimeOffset expireAt) {
        var payload = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{userId}:{sessionId}:{refreshToken}"));
        
        var cookieOptions = new CookieOptions {
            HttpOnly = true,                            // Prevent JavaScript access.
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,             // Prevent CSRF
            Expires = expireAt,
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
        if (!TryExtractRefreshToken(out Guid userId, out Guid sessionId, out string refreshToken)) {
            return Unauthorized(new ApiResponse(Errors.InvalidRefreshToken()));
        }

        var result = await sender.Send(new RefreshCommand(userId, sessionId, refreshToken));
        
        if (!result.IsSuccess) {
            // we could return BadRequest user is not found, but it could be abused as a user query mechanism.
            return Unauthorized(new ApiResponse(Errors.InvalidCredentials()));
        }
        
        RefreshResult value = result.Value!;
        
        SetAccessTokenCookie(value.AccessToken, value.AccessTokenExpireAt);
        SetRefreshTokenCookie(userId, sessionId, value.RefreshToken, value.RefreshTokenExpireAt);
        
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
    
    [HttpPost("delete-account"), Idempotent(60)]
    public async Task<ActionResult<ApiResponse>> DeleteAccount(
        [FromBody] DeleteAccountRequest request
    ) {
        Result result = await sender.Send(new DeleteAccountCommand(
            request.Reason, 
            request.ExtraMessage, 
            request.RestorationPassword
        ));

        if (!result.IsSuccess) {
            return result.Error.Code switch {
                nameof(Errors.PendingAccountDeletionExists) => Ok(new ApiResponse(Error.None)),
                nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
                nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse(result.Error)),
                _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
            };
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
        
        return Ok(new ApiResponse(Error.None));
    }

    [HttpPost("restore-account")]
    public async Task<ActionResult<ApiResponse<RestoreAccountResponse>>> RestoreAccount(
        [FromBody] RestoreAccountRequest request
    ) {
        if (!TryExtractRefreshToken(out Guid userId, out Guid sessionId, out string refreshToken)) {
            return Unauthorized(new ApiResponse(Errors.InvalidRefreshToken()));
        }
        
        var restoreResult = await sender.Send(new RestoreAccountCommand(request.RestorationPassword));

        if (!restoreResult.IsSuccess) {
            return restoreResult.Error.Code switch {
                nameof(Errors.AccountExpired) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(restoreResult.Error)),
                nameof(Errors.InvalidCredentials) => BadRequest(new ApiResponse(restoreResult.Error)),
                nameof(Errors.NoPendingAccountDeletion) => NotFound(new ApiResponse(Error.None)),
                nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(restoreResult.Error)),
                nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse(restoreResult.Error)),
                _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(restoreResult.Error)),
            };
        }
        
        var refreshResult = await sender.Send(new RefreshCommand(userId, sessionId, refreshToken));
        
        if (!refreshResult.IsSuccess) {
            // we could return BadRequest user is not found, but it could be abused as a user query mechanism.
            return Unauthorized(new ApiResponse(Errors.InvalidCredentials()));
        }
        
        RefreshResult refreshValue = refreshResult.Value!;
        
        SetAccessTokenCookie(refreshValue.AccessToken, refreshValue.AccessTokenExpireAt);
        SetRefreshTokenCookie(userId, sessionId, refreshValue.RefreshToken, refreshValue.RefreshTokenExpireAt);
        
        return Ok(new ApiResponse<RestoreAccountResponse>(
            new(refreshValue.AuthorizationInfo, refreshValue.TokenType, refreshValue.AccessToken), 
            Error.None
        ));
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
        var result = await sender.Send(new ConfirmEmailCommand(request.Email, request.ConfirmationCode));
        
        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) or nameof(Errors.InvalidConfirmationCode) => BadRequest(new ApiResponse(result.Error)),
            nameof(Errors.UserAlreadyVerified) => Ok(new ApiResponse(Error.None)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(Errors.UnexpectedError())),
        };
    }
    
    [HttpPost("forgot-password"), AllowAnonymous]
    public async Task<ActionResult<ApiResponse>> ForgotPassword([FromBody] ForgotPasswordRequest request) {
        await sender.Send(new SendPasswordResetMailCommand(request.Email));
        return Ok(new ApiResponse(Error.None));
    }

    [HttpPost("reset-password"), AllowAnonymous]
    public async Task<ActionResult<ApiResponse>> ResetPassword([FromBody] ResetPasswordRequest request) {
        var result = await sender.Send(new ResetPasswordCommand(request.Email, request.Token, request.Password));

        if (result.IsSuccess) {
            return Ok(new ApiResponse(Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromEmail) => BadRequest(new ApiResponse(Errors.UnexpectedError())),
            nameof(Errors.InvalidCredentials) => BadRequest(new ApiResponse(result.Error)),
            nameof(Errors.ValidationErrorsOccurred) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("change-password")]
    public async Task<ActionResult<ApiResponse>> ChangePassword([FromBody] ChangePasswordRequest request) {
        var result = await sender.Send(new ChangePasswordCommand(request.OldPassword, request.NewPassword));
        
        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) or nameof(Errors.InvalidConfirmationCode) => BadRequest(new ApiResponse(result.Error)),
            nameof(Errors.InvalidCredentials) => Unauthorized(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(Errors.UnexpectedError())),
        };
    }

    private bool TryExtractRefreshToken(out Guid userId, out Guid sessionId, out string refreshToken) {
        if (!Request.Cookies.TryGetValue("X-Refresh-Token", out var cookiePayload)) {
            goto failure;
        }

        string decodedPayload;

        try {
            decodedPayload = Encoding.UTF8.GetString(Convert.FromBase64String(cookiePayload));
        } catch {
            goto failure;
        }
        
        if (
            decodedPayload.Split(':', 3) is not { Length: 3 } parts || 
            !Guid.TryParse(parts[0], out userId) ||
            !Guid.TryParse(parts[1], out sessionId)
        ) {
            goto failure;
        }

        refreshToken = parts[2];
        return true;
        
        failure:
        userId = sessionId = Guid.Empty;
        refreshToken = string.Empty;
        return false;
    }
    
    // ReSharper disable NotAccessedPositionalProperty.Global
    public sealed record LoginRequest(
        [Required, EmailAddress] string Email,
        [Required, DataType(DataType.Password)] string Password
    );
    
    public sealed record LoginResponse(UserAuthorizationInfo Authorization, string TokenType, string AccessToken);
    public sealed record RefreshResponse(UserAuthorizationInfo Authorization, string TokenType, string AccessToken);
    public sealed record RestoreAccountResponse(UserAuthorizationInfo Authorization, string TokenType, string AccessToken);
    
    public sealed record RegisterRequest(
        [Required, EmailAddress] string Email, 
        [Required, DataType(DataType.Password)] string Password,
        [Required, DataType(DataType.Password)] string ConfirmPassword
    );
    // ReSharper restore NotAccessedPositionalProperty.Global

    public sealed record ConfirmEmailRequest(string Email, string ConfirmationCode);
    
    public sealed record DeleteAccountRequest(
        [Required] UserAccountDeleteReason Reason, 
        [MaxLength(255)] string? ExtraMessage,
        string RestorationPassword
    );

    public sealed record RestoreAccountRequest(
        string RestorationPassword
    );

    public sealed record ChangePasswordRequest(
        string OldPassword,
        string NewPassword
    );

    public sealed record ForgotPasswordRequest(
        string Email
    );

    public sealed record ResetPasswordRequest(
        string Email,
        string Token,
        string Password
    );
}
