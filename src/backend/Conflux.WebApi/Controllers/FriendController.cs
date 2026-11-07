using Conflux.Application.Features.Friends;
using Conflux.Domain;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Conflux.WebApi.Controllers;

[ApiController, Route("api/friends"), Authorize]
public sealed class FriendController(
    IMediator mediator
) : ControllerBase {
    [HttpDelete("{friendId:guid}")]
    public async Task<ActionResult<ApiResponse>> Unfriend(Guid friendId) {
        Result result = await mediator.Send(new UnfriendCommand(friendId));

        if (result.IsSuccess) {
            return NoContent();
        }

        return result.Error.Code switch {
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.NotFriend) => Conflict(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
}
