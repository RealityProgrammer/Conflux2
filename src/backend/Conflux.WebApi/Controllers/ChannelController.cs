using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/channels")]
public sealed class ChannelController(
    IChannelService channelService
) : ControllerBase {
    [HttpPost("dm/{toUserId:guid}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<DirectMessageResolutionResponse>>> GetOrCreateDirectMessageChannel(
        Guid toUserId
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var currentUserId)) {
            return BadRequest(new ApiResponse<DirectMessageResolutionResponse>(null, Errors.InvalidIdentifier()));
        }

        Result<ChannelResolutionResult> result = 
            await channelService.GetOrCreateDirectMessageChannelAsync(currentUserId, toUserId);

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

    public record DirectMessageResolutionResponse(Guid ChannelId);
}