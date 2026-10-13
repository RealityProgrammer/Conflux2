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
    public async Task<ActionResult> GetAttachmentUrl(
        Guid attachmentId, 
        [FromQuery] bool download = false, 
        CancellationToken cancellationToken = default
    ) {
        var mediaInfo = await messageMediaService.GetAttachment(attachmentId, cancellationToken);
        if (mediaInfo == null) return NotFound();
        
        Response.GetTypedHeaders().CacheControl = new() {
            Public = true,
            MaxAge = TimeSpan.FromDays(7),
        };
        
        Response.Headers.ContentDisposition = 
            string.IsNullOrWhiteSpace(mediaInfo.FileName) ? "attachment" : $"attachment; filename=\"{mediaInfo.FileName}\"";
        
        return File(
            mediaInfo.Stream, 
            mediaInfo.ContentType, 
            null, 
            new Microsoft.Net.Http.Headers.EntityTagHeaderValue($"\"{mediaInfo.Version}\"")
        );
    }
}