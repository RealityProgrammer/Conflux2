using Conflux.Application.Features.Conversation;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers.Conversation;

[ApiController]
[Route("api/conversations/direct")]
[Authorize]
public sealed class DirectConversationController(
    ISender sender
) : ControllerBase {
    [HttpPost("{peerId:guid}")]
    public async Task<ActionResult<ApiResponse<DirectConversationSummary>>> GetConversationSummary(Guid peerId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await sender.Send(new GetDirectConversationSummaryCommand(userId, peerId));
        
        if (result.IsSuccess) {
            return Ok(new ApiResponse<DirectConversationSummary>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    // [HttpGet("call")]
    // public async Task<ActionResult<ApiResponse<UserIdentityProfileDto>>> GetCurrentRingingCall() {
    //     var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
    //
    //     if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
    //         return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
    //     }
    //
    //     var result = await sender.Send(new GetRingingCallQuery(userId));
    //     
    //     if (result.IsSuccess) {
    //         return Ok(new ApiResponse<UserIdentityProfileDto>(result.Value, Error.None));
    //     }
    //     
    //     return result.Error.Code switch {
    //         nameof(Errors.ResourceNotFound) => NoContent(), // hmmmm...
    //         _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
    //     };
    // }
}