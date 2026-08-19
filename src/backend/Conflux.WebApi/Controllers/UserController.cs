using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public sealed class UserController(
    IUserService userService
) : ControllerBase {
    [HttpGet("{userId:guid}/avatar")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Client)]
    public RedirectResult GetAvatarUrl(Guid userId) {
        var result = userService.GetAvatarUrl(userId);
        return Redirect(result);
    }
    
    [HttpDelete("{userId:guid}/avatar")]
    public async Task<ActionResult<ApiResponse>> DeleteAvatar(Guid userId) {
        var result = await userService.DeleteAvatar(userId);
        
        if (result.IsSuccess) {
            return NoContent();
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NoContent(),
            nameof(Errors.NoUserFoundFromId) => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error))
        };
    }
    
    [HttpGet("{id:guid}/profile")]
    public async Task<ActionResult<ApiResponse<UserIdentityProfileDto>>> GetIdentityProfile(Guid id) {
        var result = await userService.GetIdentityProfile(id);
    
        if (result.IsSuccess) {
            return Ok(new ApiResponse<UserIdentityProfileDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse<UserIdentityProfileDto>(null, result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<UserIdentityProfileDto>(null, result.Error)),
        };
    }
}