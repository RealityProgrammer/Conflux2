using Conflux.Application.Features.Commands;
using Conflux.Application.Features.Commands.DeleteUserAvatar;
using Conflux.Application.Services;
using Conflux.Domain;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public sealed class UserController(
    IBlobUrlProvider blobUrlProvider,
    IMediator mediator
) : ControllerBase {
    [HttpGet("{userId:guid}/avatar")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Client)]
    public RedirectResult GetAvatarUrl(Guid userId) {
        return Redirect(blobUrlProvider.GetUserAvatarPreSignedUrl(userId));
    }
    
    [HttpDelete("{userId:guid}/avatar")]
    public async Task<ActionResult<ApiResponse>> DeleteAvatar(Guid userId) {
        var result = await mediator.Send(new DeleteUserAvatarCommand(userId));
        
        if (result.IsSuccess) {
            return NoContent();
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NoContent(),
            nameof(Errors.NoUserFoundFromId) => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error))
        };
    }
}