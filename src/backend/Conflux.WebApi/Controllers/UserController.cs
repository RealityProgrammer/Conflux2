using Conflux.Application.Services;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public sealed class UserController(
    IBlobUrlProvider blobUrlProvider,
    IMediator mediator
) : ControllerBase {
    [HttpGet("{userId:guid}/avatar")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Client)]
    public async Task<RedirectResult> GetAvatarUrl(Guid userId) {
        return Redirect(await blobUrlProvider.GetUserAvatarPreSignedUrl(userId));
    }
    
    [HttpGet("{userId:guid}/banner")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Client)]
    public async Task<RedirectResult> GetBannerUrl(Guid userId) {
        return Redirect(await blobUrlProvider.GetUserBannerPreSignedUrl(userId));
    }
}