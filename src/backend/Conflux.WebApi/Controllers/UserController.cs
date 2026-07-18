using Conflux.Application;
using Conflux.Application.Responses;
using Conflux.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/user")]
public sealed class UserController : ControllerBase {
    private readonly IUserService _userService;
    private readonly IConfiguration _config;

    public UserController(IUserService userService, IConfiguration config) {
        _userService = userService;
        _config = config;
    }
    
    [HttpPost("avatar")]
    [Authorize]
    public async Task<ActionResult> UploadAvatar([FromForm] UploadAvatarRequest request) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return Unauthorized();
        }
        
        // TODO: Validate file mime-type (via actual content instead of file name extension).
        
        var file = request.File;
        
        await using var fileStream = file.OpenReadStream();
        var result = await _userService.UploadAvatarAsync(userId, fileStream, file.ContentType);

        if (result.IsSuccess) {
            return Ok(new UploadAvatarResponse(result.Value.S3Key, null));
        }

        return result.Error.Code switch {
            "User.UploadAvatar.ServiceUnavailable" => StatusCode(StatusCodes.Status503ServiceUnavailable, new UploadAvatarResponse(null, result.Error.Message)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new UploadAvatarResponse(null, result.Error.Message))
        };
    }

    [HttpGet("avatar")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Client)]
    public async Task<ActionResult> GetAvatarUrl([FromQuery] string userId) {
        if (string.IsNullOrEmpty(userId)) {
            return BadRequest("User ID is required.");
        }

        if (!Guid.TryParse(userId, out var userIdGuid)) {
            return BadRequest();
        }

        var result = _userService.GetAvatarUrl(userIdGuid, Request.IsHttps);
        
        if (result.IsSuccess) {
            return Redirect(result.Value);
        }

        return result.Error.Code switch {
            "User.OpenAvatar.NotFound" => NotFound(new GetAvatarUrlResponse(null, result.Error.Message)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new GetAvatarUrlResponse(null, result.Error.Message)),
        };
    }

    [HttpDelete("avatar")]
    [Authorize]
    public async Task<ActionResult> DeleteAvatar() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim)) {
            return BadRequest("User ID is required.");
        }

        if (!Guid.TryParse(idClaim, out var userIdGuid)) {
            return BadRequest();
        }
        
        var result = await _userService.DeleteAvatarAsync(userIdGuid);
        
        if (result.IsSuccess || result.Error.Code == "User.DeleteAvatar.NotFound") {
            return NoContent();
        }

        return StatusCode(StatusCodes.Status500InternalServerError, new GetAvatarUrlResponse(null, result.Error.Message));
    }

    [HttpGet("profile")]
    public async Task<ActionResult> GetSessionUserBasicProfile() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim)) {
            return BadRequest(new GetSessionUserBasicProfileResponse(null, "User ID is required."));
        }
        
        if (!Guid.TryParse(idClaim, out var userIdGuid)) {
            return BadRequest();
        }
        
        Result<UserBasicProfileResponse> result = await _userService.GetUserBasicProfileAsync(userIdGuid);

        if (result.IsSuccess) {
            return Ok(new GetSessionUserBasicProfileResponse(result.Value, null));
        }

        return result.Error.Code switch {
            "User.Profile.NoId" => NotFound(new GetSessionUserBasicProfileResponse(null, result.Error.Message)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new GetSessionUserBasicProfileResponse(null, result.Error.Message))
        };
    }
    
    public record UploadAvatarRequest([Required] IFormFile File);
    public record UploadAvatarResponse(string? Url, string? Message);
    public record GetAvatarUrlResponse(string? Url, string? Message);
    public record GetSessionUserBasicProfileResponse(UserBasicProfileResponse? Profile, string? Message);
}