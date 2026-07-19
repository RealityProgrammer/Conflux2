using Conflux.Application;
using Conflux.Application.Requests;
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
    public async Task<ActionResult<ApiResponse>> UploadAvatar([FromForm] UploadAvatarRequest request) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return Unauthorized();
        }
        
        // TODO: Validate file mime-type (via actual content instead of file name extension).
        
        var file = request.File;
        
        await using var fileStream = file.OpenReadStream();
        var result = await _userService.UploadAvatarAsync(userId, fileStream, file.ContentType);
        
        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            "User.UploadAvatar.ServiceUnavailable" => StatusCode(StatusCodes.Status503ServiceUnavailable, new ApiResponse(result.Error.Message)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error.Message))
        };
    }

    [HttpGet("avatar")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Client)]
    public async Task<ActionResult<ApiResponse<GetAvatarUrlResponse>>> GetAvatarUrl([FromQuery] string userId) {
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userIdGuid)) {
            return BadRequest(new ApiResponse<GetAvatarUrlResponse>(null, "Invalid identifier."));
        }

        var result = _userService.GetAvatarUrl(userIdGuid, Request.IsHttps);
        
        if (result.IsSuccess) {
            return Redirect(result.Value);
        }

        return result.Error.Code switch {
            "User.OpenAvatar.NotFound" => NotFound(new ApiResponse<GetAvatarUrlResponse>(null, result.Error.Message)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<GetAvatarUrlResponse>(null, result.Error.Message)),
        };
    }

    [HttpDelete("avatar")]
    [Authorize]
    public async Task<ActionResult<ApiResponse>> DeleteAvatar() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userIdGuid)) {
            return BadRequest(new ApiResponse("Invalid identifier."));
        }
        
        var result = await _userService.DeleteAvatarAsync(userIdGuid);
        
        if (result.IsSuccess || result.Error.Code == "User.DeleteAvatar.NotFound") {
            return NoContent();
        }

        return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error.Message));
    }

    [HttpGet("profile")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserBasicProfileResponse>>> GetSessionUserBasicProfile() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userIdGuid)) {
            return BadRequest(new ApiResponse<UserBasicProfileResponse>(null, "Invalid identifier."));
        }
        
        Result<UserBasicProfileResponse> result = await _userService.GetUserBasicProfileAsync(userIdGuid);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<UserBasicProfileResponse>(result.Value, null));
        }

        return result.Error.Code switch {
            "User.Profile.NoId" => NotFound(new ApiResponse<UserBasicProfileResponse>(null, result.Error.Message)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<UserBasicProfileResponse>(null, result.Error.Message)),
        };
    }

    [HttpPost("setup-profile")]
    [Authorize]
    public async Task<ActionResult<ApiResponse>> SetupProfile([FromForm] SetupProfileRequest request) {
        if (request is { AvatarOperation: AvatarOperationType.Set, AvatarFile: null }) {
            return BadRequest(new ApiResponse("Avatar file not set."));
        }
        
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userIdGuid)) {
            return BadRequest(new ApiResponse<UserBasicProfileResponse>(null, "Invalid identifier."));
        }

        if (request.AvatarOperation == AvatarOperationType.Set) {
            // TODO: Validate avatar.
        }
        
        await using var avatarFileStream = request.AvatarFile?.OpenReadStream() ?? Stream.Null;
        
        Result result = await _userService.SetupProfileAsync(new(
            userIdGuid,
            request.UserName,
            request.DisplayName,
            new(request.AvatarOperation, avatarFileStream, request.AvatarFile?.ContentType)
        ));
        
        if (result.IsSuccess) {
            return Ok();
        }
        
        return StatusCode(StatusCodes.Status500InternalServerError);
    }

    public record UploadAvatarRequest([Required] IFormFile File);
    public record GetAvatarUrlResponse(string? Url);
    public record SetupProfileRequest(
        [Required, StringLength(maximumLength: 64, MinimumLength = 8, ErrorMessage = "Username must be between 8 and 64 characters.")] string UserName, 
        [Required, StringLength(maximumLength: 64, MinimumLength = 8, ErrorMessage = "Display name must be between 8 and 64 characters.")] string DisplayName, 
        [EnumDataType(typeof(AvatarOperationType), ErrorMessage = "Invalid avatar operation.")] AvatarOperationType AvatarOperation, 
        IFormFile? AvatarFile
    );
}