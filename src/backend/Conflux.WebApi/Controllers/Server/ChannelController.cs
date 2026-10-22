using Conflux.Application.Enums;
using Conflux.Application.Features.Servers;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.WebApi.Attributes;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.Controllers.Server;

[ApiController]
[Route("api/communities/{serverId:guid}/channels")]
[Authorize]
public sealed class ChannelController(ISender sender) : ControllerBase {
    [HttpGet("{channelId:guid}")]
    public async Task<ActionResult<ApiResponse<ChannelDetailsDto>>> GetSummary(Guid serverId, Guid channelId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        var result = await sender.Send(new GetChannelDetailsQuery(serverId, channelId, userId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<ChannelDetailsDto>(result.Value, Domain.Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPost]
    [Idempotent(15)]
    public async Task<ActionResult<ApiResponse<ServerChannelIdentityDto>>> CreateChannels(
        Guid serverId,
        [FromBody] CreateChannelRequest request
    ) {
        var result = await sender.Send(new CreateServerChannelCommand(
            serverId, 
            request.Name, 
            request.Type, 
            request.CategoryId
        ));
        
        if (result.IsSuccess) {
            return Created((Uri?)null, new ApiResponse<ServerChannelIdentityDto>(result.Value, Domain.Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ValidationErrorsOccurred) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpDelete("{channelId:guid}")]
    public async Task<ActionResult> DeleteChannel(Guid serverId, Guid channelId) {
        var result = await sender.Send(new DeleteServerChannelCommand(serverId, channelId));
        
        if (result.IsSuccess) {
            return NoContent();
        }
        
        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    public sealed record CreateChannelRequest(
        [StringLength(32, ErrorMessage = "{0} can only have maximum length of {1} characters.")] string Name,
        ChannelType Type,
        Guid? CategoryId
    );
}