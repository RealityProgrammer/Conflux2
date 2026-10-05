using Conflux.Application.Dto;
using Conflux.Application.Features.Conversation;
using Conflux.Application.Features.Friends;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

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

    [HttpGet("call")]
    public async Task<ActionResult<ApiResponse<UserIdentityProfileDto>>> GetCurrentRingingCall() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        var result = await sender.Send(new GetRingingCallQuery(userId));
        
        if (result.IsSuccess) {
            return Ok(new ApiResponse<UserIdentityProfileDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NoContent(), // hmmmm...
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPost("{peerId:guid}/call")]
    public async Task<ActionResult<ApiResponse<StartCallResult>>> StartCall(Guid peerId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var callerId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        var result = await sender.Send(new StartCallCommand(callerId, peerId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<StartCallResult>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPatch("{peerId:guid}/call/cancel")]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> CancelCall(Guid peerId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var callerId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        var result = await sender.Send(new CancelCallCommand(callerId, peerId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPatch("{peerId:guid}/call/accept")]
    public async Task<ActionResult<ApiResponse>> AcceptCall(Guid peerId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var calleeId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        var result = await sender.Send(new AcceptCallCommand(peerId, calleeId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse(Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPatch("{peerId:guid}/call/reject")]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> RejectCall(Guid peerId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var calleeId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        var result = await sender.Send(new DenyCallCommand(peerId, calleeId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPatch("{peerId:guid}/call/end")]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> EndCall(Guid peerId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var enderId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        var result = await sender.Send(new EndCallCommand(enderId, peerId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
}