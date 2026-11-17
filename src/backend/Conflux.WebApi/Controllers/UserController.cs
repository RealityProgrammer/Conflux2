using Conflux.Application.Dto;
using Conflux.Application.Features.Users;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController, Route("api/users"), Authorize]
public sealed class UserController(
    IUserMediaService userMediaService,
    ISender sender
) : ControllerBase {
    [HttpGet("{userId:guid}/avatar")]
    public RedirectResult GetAvatarMediaRedirect(Guid userId, CancellationToken cancellationToken) {
        string preSignedUrl = userMediaService.GetAvatarPreSignedUrl(userId, TimeSpan.FromHours(3));
        return Redirect(preSignedUrl);
    }
    
    [HttpGet("{userId:guid}/banner")]
    public RedirectResult GetBannerMediaRedirect(Guid userId, CancellationToken cancellationToken) {
        string preSignedUrl = userMediaService.GetBannerPreSignedUrl(userId, TimeSpan.FromHours(3));
        return Redirect(preSignedUrl);
    }
    
    [HttpPost("get-identities")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<UserIdentityProfileDto>>>> GetIdentities(
        [FromBody] GetIdentitiesRequest request
    ) {
        if (request.Ids.Count == 0) {
            return Ok(new ApiResponse<IReadOnlyList<UserIdentityProfileDto>>([], Error.None));
        }

        var result = await sender.Send(new QueryIdentities(request.Ids));
        if (result.IsSuccess) {
            return Ok(new ApiResponse<IReadOnlyList<UserIdentityProfileDto>>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.ValidationErrorsOccurred) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpGet("discover-friend")]
    public async Task<ActionResult<ApiResponse<FriendSearchResponse>>> SearchFriend(
        [FromQuery(Name = "search")] string search
    ) {
        var result = await sender.Send(new DiscoverFriend(search));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<FriendSearchResponse>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.DisallowSelfAction) => BadRequest(new ApiResponse(Errors.ValidationErrorsOccurred(new() {
                [nameof(search)] = [result.Error.Message],
            }))),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    public sealed record GetIdentitiesRequest(List<Guid> Ids);
}