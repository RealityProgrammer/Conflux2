using Conflux.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/user")]
public sealed class UserController : ControllerBase {
    private readonly IUserService _userService;

    public UserController(IUserService userService) {
        _userService = userService;
    }
    
    [HttpPost("upload-avatar")]
    [Authorize]
    public async Task<ActionResult> UploadAvatar([FromForm] UploadAvatarRequest request) {
        var userId = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(userId)) {
            return Unauthorized();
        }
        
        // TODO: Validate file mime-type (via actual content instead of file name extension).
        
        var file = request.File;
        
        await using var fileStream = file.OpenReadStream();
        var result = await _userService.UploadAvatarAsync(userId, fileStream, file.ContentType);

        if (result.IsSuccess) {
            return Ok(new UploadAvatarResponse(result.Value.S3Key));
        }

        // TODO: more detail returning.
        return StatusCode(StatusCodes.Status500InternalServerError);
    }
    
    public record UploadAvatarRequest([Required] IFormFile File);

    public record UploadAvatarResponse(string Url);
}