using Conflux.Application.Services;
using Conflux.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Conflux.WebApi.Controllers;

[ApiController, Route("api/attachments/{attachmentId:guid}"), Authorize]
public sealed class AttachmentController(
    IMessageMediaService messageMediaService
) : ControllerBase {
    [HttpGet("image")]
    public RedirectResult GetImage(Guid attachmentId) {
        return Redirect(messageMediaService.GetPreSignedUrl(attachmentId, TimeSpan.FromHours(3)));
    }

    [HttpGet("download")]
    public ActionResult GetDownload(Guid attachmentId) {
        return Redirect(messageMediaService.GetDownloadPreSignedUrl(attachmentId, "attachment", TimeSpan.FromMinutes(15)));
    }
}