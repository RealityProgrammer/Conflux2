using Conflux.Application.Dto;
using Conflux.Application.Features.Servers;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers.Server;

[Authorize, ApiController, Route("api/communities/{serverId:guid}/emojis")]
public sealed class ServerEmojiController(
    ISender sender
) : ControllerBase {
    [HttpGet("entries")]
    public async Task<ActionResult<ApiResponse<List<EmojiEntryDto>>>> Get(Guid serverId) {
        var result = await sender.Send(new QueryEmojiEntries(serverId));

        return Ok(new ApiResponse<List<EmojiEntryDto>>(result, Error.None));
    }
    
    [HttpGet("management")]
    public async Task<ActionResult<ApiResponse<List<EmojiManagementDto>>>> GetForManagement(Guid serverId) {
        var result = await sender.Send(new QueryEmojisForManagement(serverId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<List<EmojiManagementDto>>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPost]
    public async Task<ActionResult<ApiResponse<EmojiDto>>> Create(Guid serverId, [FromForm] CreateEmojiRequest request) {
        using var stream = request.Image.OpenReadStream();
        var result = await sender.Send(new CreateEmojiCommand(serverId, request.ShortCode, stream));

        if (result.IsSuccess) {
            return Created((string?)null, new ApiResponse<EmojiDto>(result.Value!, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => BadRequest(new ApiResponse(result.Error)),
            nameof(Errors.ServerEmojiLimit) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPost("delete")]
    public async Task<ActionResult<ApiResponse>> BulkDelete(
        Guid serverId, 
        [FromBody] BulkDeleteEmojiRequest request
    ) {
        var result = await sender.Send(new BulkDeleteEmojiCommand(serverId, request.Ids));

        if (result.IsSuccess) {
            return NoContent();
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    public sealed record CreateEmojiRequest([MaxLength(48)] string ShortCode, [Required] IFormFile Image);
    public sealed record BulkDeleteEmojiRequest(List<Guid> Ids);
}