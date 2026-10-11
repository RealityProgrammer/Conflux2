using Conflux.Application.Services;
using Conflux.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/attachments")]
[Authorize]
public sealed class AttachmentController(
    IMessageMediaService messageMediaService
) : ControllerBase {
    [HttpGet("{attachmentId:guid}")]
    [ResponseCache(Duration = 1800, Location = ResponseCacheLocation.Client)]
    public async Task<ActionResult> GetAttachmentUrl(Guid attachmentId, [FromQuery] bool download = false) {
        var result = await messageMediaService.GetAttachmentUrl(attachmentId, TimeSpan.FromHours(1), download: download);

        if (result.IsSuccess) {
            return Redirect(result.Value!);
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(),
            _ => StatusCode(StatusCodes.Status500InternalServerError),
        };
    }
}