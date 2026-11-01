using Conflux.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Conflux.WebApi.Controllers;

[ApiController, Route("api/emojis"), Authorize]
public sealed class EmojiController(
    IEmojiMediaService emojiMediaService
) : ControllerBase {
    [HttpGet("{emojiId:guid}/image")]
    public RedirectResult GetAvatarUrl(Guid emojiId, CancellationToken cancellationToken) {
        string preSignedUrl = emojiMediaService.GetPreSignedUrl(emojiId, TimeSpan.FromHours(3));
        return Redirect(preSignedUrl);
    }
}