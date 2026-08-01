using Conflux.Application.Dto.Responses;
using Conflux.Application.Interfaces;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/friend")]
[Authorize]
public sealed class FriendController(
    IFriendService friendService,
    ILogger<FriendController> logger
) : ControllerBase {
    [HttpPost("requests/{toUserId:guid}")]
    public async Task<ActionResult<ApiResponse<SendFriendRequestResponse>>> SendFriendRequest(Guid toUserId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        Result<SendFriendRequestResponse> result = await friendService.SendFriendRequestAsync(userId, toUserId);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<SendFriendRequestResponse>(result.Value, Error.None));
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
        
        Result result = await friendService.CancelFriendRequestAsync(userId, toUserId);

        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.Unauthorized) => Unauthorized(new ApiResponse(result.Error)),
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
        
        Result result = await friendService.RejectFriendRequestAsync(userId, senderUserId);

        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.Unauthorized) => Unauthorized(new ApiResponse(result.Error)),
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
        
        Result result = await friendService.AcceptFriendRequestAsync(userId, senderUserId);

        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.Unauthorized) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.FriendRequestCanceled) or 
            nameof(Errors.FriendRequestRejected) => Conflict(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPost("unfriend/{userId:guid}")]
    public async Task<ActionResult<ApiResponse>> Unfriend([FromRoute] Guid userId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var currentUserId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        Result result = await friendService.UnfriendAsync(currentUserId, userId);

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
        [FromQuery] int offset,
        [FromQuery] int count
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<UserBasicProfileSummary>(null, Errors.InvalidIdentifier()));
        }
        
        offset = int.Max(offset, 0);
        count = int.Max(count, 1);
        
        Result<PaginatedResult<DiscoverFriendSummary>> result = await friendService.DiscoverFriendsAsync(userId, name, offset, count);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<PaginatedResult<DiscoverFriendSummary>>(result.Value, Error.None));
        }

        return StatusCode(
            StatusCodes.Status500InternalServerError, 
            new ApiResponse<PaginatedResult<DiscoverFriendSummary>>(null, result.Error)
        );
    }
    
    [HttpGet("friends")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<PaginatedResult<FriendSummary>>>> QueryFriends(
        [FromQuery] string? name,
        [FromQuery] int offset,
        [FromQuery] int count
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<FriendSummary>(null, Errors.InvalidIdentifier()));
        }
        
        offset = int.Max(offset, 0);
        count = int.Max(count, 1);
        
        Result<PaginatedResult<FriendSummary>> result = await friendService.QueryFriendsAsync(userId, name, offset, count);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<PaginatedResult<FriendSummary>>(result.Value, Error.None));
        }

        return StatusCode(
            StatusCodes.Status500InternalServerError, 
            new ApiResponse<PaginatedResult<FriendSummary>>(null, result.Error)
        );
    }

    [HttpGet("pending-requests")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<PaginatedResult<PendingFriendRequestSummary>>>> QueryPendingRequests(
        [FromQuery] string? name,
        [FromQuery] int offset,
        [FromQuery] int count
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<PendingFriendRequestSummary>(null, Errors.InvalidIdentifier()));
        }
        
        offset = int.Max(offset, 0);
        count = int.Max(count, 1);
        
        Result<PaginatedResult<PendingFriendRequestSummary>> result = 
            await friendService.QueryPendingRequestsAsync(userId, name, offset, count);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<PaginatedResult<PendingFriendRequestSummary>>(result.Value, Error.None));
        }

        return StatusCode(
            StatusCodes.Status500InternalServerError, 
            new ApiResponse<PaginatedResult<PendingFriendRequestSummary>>(null, result.Error)
        );
    }
}