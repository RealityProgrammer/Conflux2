using Conflux.Application.Services;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public sealed class UserController(
    IUserMediaService userMediaService
) : ControllerBase {
    [HttpGet("{userId:guid}/avatar")]
    public async Task<ActionResult> GetAvatarUrl(Guid userId, CancellationToken cancellationToken) {
        var mediaInfo = await userMediaService.GetAvatar(userId, cancellationToken);
        if (mediaInfo == null) return NotFound();
        
        Response.GetTypedHeaders().CacheControl = new() {
            Public = true,
            MaxAge = TimeSpan.FromDays(30),
        };
        
        return File(
            mediaInfo.Stream, 
            mediaInfo.ContentType, 
            null, 
            new Microsoft.Net.Http.Headers.EntityTagHeaderValue($"\"{mediaInfo.Version}\"")
        );
    }
    
    [HttpGet("{userId:guid}/banner")]
    public async Task<ActionResult> GetBannerUrl(Guid userId, CancellationToken cancellationToken) {
        var mediaInfo = await userMediaService.GetBanner(userId, cancellationToken);
        if (mediaInfo == null) return NotFound();
        
        Response.GetTypedHeaders().CacheControl = new() {
            Public = true,
            MaxAge = TimeSpan.FromDays(30),
        };
        
        return File(
            mediaInfo.Stream, 
            mediaInfo.ContentType, 
            null, 
            new Microsoft.Net.Http.Headers.EntityTagHeaderValue($"\"{mediaInfo.Version}\"")
        );
    }
}