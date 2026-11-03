using Conflux.Application.Dto;
using Conflux.Application.Features.Conversation;
using Conflux.Domain;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers.Conversation;

[ApiController, Route("api/conversations"), Authorize]
public sealed class ConversationController(
    ISender sender
) : ControllerBase {
    [HttpGet("dm/{peerId:guid}")]
    public async Task<ActionResult<ApiResponse<DmConversationDetails>>> GetDmConversationDetails(Guid peerId) {
        var result = await sender.Send(new QueryDmConversationDetails(peerId));
        
        if (result.IsSuccess) {
            return Ok(new ApiResponse<DmConversationDetails>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpGet("servers/{serverId:guid}/channels/{channelId:guid}")]
    public async Task<ActionResult<ApiResponse<ServerChannelConversationDetails>>> GetServerChannelConversationDetails(Guid serverId, Guid channelId) {
        var result = await sender.Send(new QueryServerChannelConversationDetails(serverId, channelId));
        
        if (result.IsSuccess) {
            return Ok(new ApiResponse<ServerChannelConversationDetails>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.RequireActiveAccount) or nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
}