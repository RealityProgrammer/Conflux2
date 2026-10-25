using Conflux.Application.Dto;
using Conflux.Application.Features.Servers;
using Conflux.Domain;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers.Server;

[Authorize, ApiController, Route("api/communities/{serverId:guid}/emojis")]
public sealed class ServerEmojiController(
    ISender sender
) : ControllerBase {
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<EmojiListItemDto>>>> Get(Guid serverId) {
        var result = await sender.Send(new QueryEmoji(serverId));

        return Ok(new ApiResponse<List<EmojiListItemDto>>(result, Error.None));
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

    [HttpDelete("{emojiId:guid}")]
    public async Task<ActionResult<ApiResponse>> Delete(Guid serverId, Guid emojiId) {
        var result = await sender.Send(new DeleteEmojiCommand(serverId, emojiId));

        if (result.IsSuccess) {
            return NoContent();
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    public sealed record CreateEmojiRequest([MaxLength(48)] string ShortCode, [Required] IFormFile Image);
}