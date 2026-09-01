using Conflux.Application.Features.Commands;
using Conflux.Application.Features.Commands.AcceptFriendRequest;
using Conflux.Application.Features.Commands.CancelFriendRequest;
using Conflux.Application.Features.Commands.RejectFriendRequest;
using Conflux.Application.Features.Commands.SendFriendRequest;
using Conflux.Application.Features.Commands.Unfriend;
using Conflux.Application.Features.Queries;
using Conflux.Application.Features.Queries.DiscoverFriends;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/friend")]
[Authorize]
public sealed class FriendController(
    IMediator mediator
) : ControllerBase {
    [HttpPost("requests/{toUserId:guid}")]
    public async Task<ActionResult<ApiResponse<UserRelationshipStatus>>> SendFriendRequest(Guid toUserId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        var result = await mediator.Send(new SendFriendRequestCommand(userId, toUserId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<UserRelationshipStatus>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.AlreadyFriended) => Conflict(new ApiResponse(result.Error)),
            nameof(Errors.DisallowSelfAction) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("requests/{toUserId:guid}/cancel")]
    public async Task<ActionResult<ApiResponse>> CancelFriendRequest([FromRoute] Guid toUserId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        Result result = await mediator.Send(new CancelFriendRequestCommand(userId, toUserId));

        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.AlreadyFriended) or nameof(Errors.FriendRequestRejected) => Conflict(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPost("requests/{senderUserId:guid}/reject")]
    public async Task<ActionResult<ApiResponse>> RejectFriendRequest([FromRoute] Guid senderUserId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        Result result = await mediator.Send(new RejectFriendRequestCommand(userId, senderUserId));

        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.AlreadyFriended) or nameof(Errors.FriendRequestCanceled) => Conflict(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPost("requests/{senderUserId:guid}/accept")]
    public async Task<ActionResult<ApiResponse>> AcceptFriendRequest([FromRoute] Guid senderUserId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        Result result = await mediator.Send(new AcceptFriendRequestCommand(userId, senderUserId));

        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.FriendRequestCanceled) or 
            nameof(Errors.FriendRequestRejected) => Conflict(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPost("unfriend/{friendId:guid}")]
    public async Task<ActionResult<ApiResponse>> Unfriend([FromRoute] Guid friendId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var currentUserId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        Result result = await mediator.Send(new UnfriendCommand(currentUserId, friendId));

        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.NotFriend) => Conflict(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpGet("discover")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<PaginatedResult<DiscoverFriendSummary>>>> DiscoverUsers(
        [FromQuery] string? name,
        [FromQuery, Required] int offset,
        [FromQuery, Required] int count
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<UserProfileDto>(null, Errors.InvalidIdentifier()));
        }
        
        offset = int.Max(offset, 0);
        count = int.Max(count, 1);
        
        var result = await mediator.Send(new DiscoverFriendsQuery(userId, name, offset, count));

        return Ok(new ApiResponse<PaginatedResult<DiscoverFriendSummary>>(result, Error.None));
    }
}