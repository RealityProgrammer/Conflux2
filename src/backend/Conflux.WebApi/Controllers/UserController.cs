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
    public async Task<ActionResult> ViewAvatar([FromQuery] string userId) {
        if (string.IsNullOrEmpty(userId)) {
            return BadRequest("User ID is required.");
        }

        if (!Guid.TryParse(userId, out var userIdGuid)) {
            return BadRequest();
        }

        var result = await _userService.OpenAvatarAsync(userIdGuid);
        
        if (result.IsSuccess) {
            var response = result.Value;
            
            Response.RegisterForDispose(response.DisposeObject);
            
            return File(response.AvatarStream, response.ContentType);
        }

        return result.Error.Code switch {
            "User.OpenAvatar.NotFound" => NotFound(),
            _ => StatusCode(StatusCodes.Status500InternalServerError),  // TODO: Better error return.
        };
    }
    
    public record UploadAvatarRequest([Required] IFormFile File);
    public record UploadAvatarResponse(string? Url, string? Message);
}