using Conflux.Application.Features.Conversation;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers.Conversation;

[ApiController, Route("api/conversations"), Authorize]
public sealed class ConversationController(
    ISender sender
) : ControllerBase {
    [HttpGet("{conversationId:guid}")]
    public async Task<ActionResult<ApiResponse<ConversationDetails>>> GetConversationDetails(Guid conversationId) {
        var result = await sender.Send(new QueryConversationDetails(conversationId));
        
        if (result.IsSuccess) {
            return Ok(new ApiResponse<ConversationDetails>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
}