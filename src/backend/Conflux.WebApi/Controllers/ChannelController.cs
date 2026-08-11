using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/channels")]
[Authorize]
public sealed class ChannelController(
    IChannelService channelService
) : ControllerBase {
    [HttpGet("dm/{channelId:guid}/summary")]
    public async Task<ActionResult<ApiResponse<DmChannelSummary>>> GetDirectMessageChannelSummary(
        Guid channelId
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var currentUserId)) {
            return BadRequest(new ApiResponse<DmChannelSummary>(null, Errors.InvalidIdentifier()));
        }
        
        Result<DmChannelSummary> result =
            await channelService.GetDmChannelSummaryAsync(currentUserId, channelId);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<DmChannelSummary>(result.Value, Error.None));
        }

        var errorResponse = new ApiResponse<DmChannelSummary>(null, result.Error);
        
        return result.Error.Code switch {
            nameof(Errors.NoDirectMessageChannelWithId) => NotFound(errorResponse),
            _ => StatusCode(StatusCodes.Status500InternalServerError, errorResponse),
        };
    }
    
    [HttpPost("dm/{toUserId:guid}")]
    public async Task<ActionResult<ApiResponse<DirectMessageResolutionResponse>>> GetOrCreateDirectMessageChannel(
        Guid toUserId
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var currentUserId)) {
            return BadRequest(new ApiResponse<DirectMessageResolutionResponse>(null, Errors.InvalidIdentifier()));
        }

        Result<ChannelResolutionResult> result = 
            await channelService.GetOrCreateDmChannelAsync(currentUserId, toUserId);

        if (result.IsSuccess) {
            DirectMessageResolutionResponse response = new(result.Value.ChannelId);
            ApiResponse<DirectMessageResolutionResponse> apiResponse = new(response, Error.None);
            
            return result.Value.Status switch {
                ChannelResolutionStatus.Existing => Ok(apiResponse),
                ChannelResolutionStatus.Created => Created((string?)null, apiResponse),
                // TODO: make the status a closed enum to make it not complain about exhaustiveness
            };
        }

        return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<DirectMessageResolutionResponse>(null, result.Error));
    }

    [HttpGet("dm")]
    public async Task<ActionResult<ApiResponse<PaginatedResult<DmConversationListItemDto>>>> GetDirectMessageChannels(
        [FromQuery] int offset, 
        [FromQuery] int count
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<DirectMessageResolutionResponse>(null, Errors.InvalidIdentifier()));
        }
        
        offset = int.Max(offset, 0);
        count = int.Max(count, 1);

        PaginatedResult<DmConversationListItemDto> result =
            await channelService.GetUserConversationsAsync(userId, offset, count);

        return Ok(new ApiResponse<PaginatedResult<DmConversationListItemDto>>(result, Error.None));
    }

    public record DirectMessageResolutionResponse(Guid ChannelId);
}