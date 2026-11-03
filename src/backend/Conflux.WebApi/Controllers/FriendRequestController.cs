using Conflux.Application.Dto;
using Conflux.Application.Features.Friends;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.WebApi.Attributes;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController, Route("api/friend-requests"), Authorize]
public sealed class FriendRequestController(
    ISender sender
) : ControllerBase {
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse<SendFriendRequestResult>>> SendFriendRequest(
        [FromBody] SendRequest request
    ) {
        var result = await sender.Send(new SendFriendRequestCommand(request.RecipientId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<SendFriendRequestResult>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.InvalidIdentifier) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.AlreadyFriended) => Conflict(new ApiResponse(result.Error)),
            nameof(Errors.DisallowSelfAction) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("{requestId:guid}/cancel"), ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse>> CancelFriendRequest(Guid requestId) {
        Result result = await sender.Send(new CancelFriendRequestCommand(requestId));

        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            nameof(Errors.InvalidIdentifier) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.AlreadyFriended) or nameof(Errors.FriendRequestRejected) => Conflict(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPost("{requestId:guid}/reject"), ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse>> RejectFriendRequest(Guid requestId) {
        Result result = await sender.Send(new RejectFriendRequestCommand(requestId));

        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            nameof(Errors.InvalidIdentifier) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.AlreadyFriended) or nameof(Errors.FriendRequestRejected) => Conflict(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPost("{requestId:guid}/accept")]
    public async Task<ActionResult<ApiResponse>> AcceptFriendRequest(Guid requestId) {
        Result result = await sender.Send(new AcceptFriendRequestCommand(requestId));

        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            nameof(Errors.InvalidIdentifier) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.FriendRequestCanceled) or 
                nameof(Errors.FriendRequestRejected) => Conflict(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    public sealed record SendRequest(Guid RecipientId);
}