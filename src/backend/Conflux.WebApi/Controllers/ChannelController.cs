using Conflux.Application.Commands;
using Conflux.Application.Queries;
using Conflux.Application.Services;
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
[Route("api/channels")]
[Authorize]
public sealed class ChannelController(
    IMediator mediator
) : ControllerBase {
    [HttpGet("dm/{channelId:guid}/summary")]
    public async Task<ActionResult<ApiResponse<DmChannelSummary>>> GetDirectMessageChannelSummary(
        Guid channelId
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var currentUserId)) {
            return BadRequest(new ApiResponse<DmChannelSummary>(null, Errors.InvalidIdentifier()));
        }
        
        var result = await mediator.Send(new DmChannelSummaryQuery(currentUserId, channelId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<DmChannelSummary>(result.Value, Error.None));
        }

        var errorResponse = new ApiResponse<DmChannelSummary>(null, result.Error);
        
        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(errorResponse),
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

        var result = 
            await mediator.Send(new CreateDmChannelCommand(currentUserId, toUserId));

        if (result.IsSuccess) {
            DirectMessageResolutionResponse response = new(result.Value.ChannelId);
            ApiResponse<DirectMessageResolutionResponse> apiResponse = new(response, Error.None);
            
#pragma warning disable CS8524
            return result.Value.Status switch {
                ChannelResolutionStatus.Existing => Ok(apiResponse),
                ChannelResolutionStatus.Created => Created((string?)null, apiResponse),
                // TODO: make the status a closed enum to make it not complain about exhaustiveness
            };
#pragma warning restore CS8524
        }

        return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<DirectMessageResolutionResponse>(null, result.Error));
    }

    public record DirectMessageResolutionResponse(Guid ChannelId);
}