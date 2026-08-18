using Conflux.Application.Dto.Requests;
using Conflux.Application.Services;
using Conflux.Application.Services.Implementations;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Humanizer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
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
    public async Task<ActionResult> GetAvatarUrl(Guid userId) {
        var result = userService.GetAvatarUrl(userId);
        return Redirect(result);
    }
    
    [HttpDelete("{userId:guid}/avatar")]
    public async Task<ActionResult<ApiResponse>> DeleteAvatar(Guid userId) {
        var result = await userService.DeleteAvatarAsync(userId);
        
        if (result.IsSuccess) {
            return NoContent();
        }

        switch (result.Error.Code) {
            case nameof(Errors.ResourceNotFound):
                return NoContent();
            
            case nameof(Errors.NoUserFoundFromId):
                return BadRequest(result.Error);
        }

        return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error));
    }
    
    [HttpGet("{id:guid}/profile")]
    public async Task<ActionResult<ApiResponse<UserIdentityProfileDto>>> GetIdentityProfile(Guid id) {
        var result = await userService.GetIdentityProfileAsync(id);
    
        if (result.IsSuccess) {
            return Ok(new ApiResponse<UserIdentityProfileDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse<UserIdentityProfileDto>(null, result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<UserIdentityProfileDto>(null, result.Error)),
        };
    }
}