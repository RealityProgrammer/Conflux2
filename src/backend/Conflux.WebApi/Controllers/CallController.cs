using Conflux.Application.Dto;
using Conflux.Application.Features.Conversation;
using Conflux.Application.Features.Friends;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Mediator;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/calls")]
public sealed class CallController(
    ISender sender
) : ControllerBase {
    [HttpPost("direct/{peerId:guid}")]
    public async Task<ActionResult<ApiResponse<StartCallResult>>> StartCall(
        Guid peerId,
        [Required, FromHeader(Name = "X-SignalR-Connection-Id")] string callerConnectionId
    ) {
        var result = await sender.Send(new StartDirectCallCommand(callerConnectionId, peerId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<StartCallResult>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.InvalidCredentials) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPatch("{callId:guid}/cancel")]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> CancelDirectCall(Guid callId) {
        var result = await sender.Send(new CancelDirectCallCommand(callId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.InvalidCredentials) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPatch("{callId:guid}/accept")]
    public async Task<ActionResult<ApiResponse>> AcceptCall(
        Guid callId,
        [Required, FromHeader(Name = "X-SignalR-Connection-Id")] string calleeConnectionId
    ) {
        var result = await sender.Send(new AcceptDirectCallCommand(callId, calleeConnectionId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse(Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.InvalidCredentials) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPatch("{callId:guid}/reject")]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> RejectCall(Guid callId) {
        var result = await sender.Send(new DenyCallCommand(callId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.InvalidCredentials) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPatch("{callId:guid}/end")]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> EndCall(Guid callId) {
        var result = await sender.Send(new EndDirectCallCommand(callId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.InvalidCredentials) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpGet("direct")]
    public async Task<ActionResult<ApiResponse<GetIncomingDirectCallQueryResult?>>> GetIncomingCall() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await sender.Send(new GetRingingCallQuery(userId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<GetIncomingDirectCallQueryResult?>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.InvalidCredentials) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.NoUserFoundFromId) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
}