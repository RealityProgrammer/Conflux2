using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/users/me")]
[Authorize]
public sealed class SessionUserController(
    IChannelService channelService,
    IFriendService friendService,
    ICommunityServerService communityServerService
) : ControllerBase {
    [HttpGet("dm")]
    public async Task<ActionResult<ApiResponse<PaginatedResult<DmConversationListItemDto>>>> GetDirectMessageChannels(
        [FromQuery] int offset, 
        [FromQuery] int count
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<ChannelController.DirectMessageResolutionResponse>(null, Errors.InvalidIdentifier()));
        }
        
        offset = int.Max(offset, 0);
        count = int.Max(count, 1);

        PaginatedResult<DmConversationListItemDto> result =
            await channelService.GetUserConversationsAsync(userId, offset, count);

        return Ok(new ApiResponse<PaginatedResult<DmConversationListItemDto>>(result, Domain.Error.None));
    }
    
    [HttpGet("friends")]
    public async Task<ActionResult<ApiResponse<PaginatedResult<UserIdentityProfileDto>>>> GetFriends(
        [FromQuery] string? name,
        [FromQuery, Required] int offset,
        [FromQuery, Required] int count
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<UserIdentityProfileDto>(null, Errors.InvalidIdentifier()));
        }
        
        offset = int.Max(offset, 0);
        count = int.Max(count, 1);
        
        var result = await friendService.QueryFriendsAsync(userId, name, offset, count);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<PaginatedResult<UserIdentityProfileDto>>(result.Value, Error.None));
        }

        return StatusCode(
            StatusCodes.Status500InternalServerError, 
            new ApiResponse<PaginatedResult<UserIdentityProfileDto>>(null, result.Error)
        );
    }

    [HttpGet("pending-requests")]
    public async Task<ActionResult<ApiResponse<PaginatedResult<PendingFriendRequestDto>>>> GetPendingFriendRequests(
        [FromQuery] string? name,
        [FromQuery, Required] int offset,
        [FromQuery, Required] int count
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<PendingFriendRequestDto>(null, Errors.InvalidIdentifier()));
        }
        
        offset = int.Max(offset, 0);
        count = int.Max(count, 1);
        
        var result = await friendService.QueryPendingRequestsAsync(userId, name, offset, count);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<PaginatedResult<PendingFriendRequestDto>>(result.Value, Error.None));
        }

        return StatusCode(
            StatusCodes.Status500InternalServerError, 
            new ApiResponse<PaginatedResult<PendingFriendRequestDto>>(null, result.Error)
        );
    }
}