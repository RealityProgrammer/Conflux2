using Conflux.Application;
using Conflux.Application.Dto.Responses;
using Conflux.Application.Services;
using Conflux.WebApi.Attributes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/friend")]
public sealed class FriendController(
    IFriendService friendService,
    ILogger<FriendController> logger
) : ControllerBase {
    [HttpPost("requests")]
    [Authorize]
    public async Task<ActionResult<ApiResponse>> SendFriendRequest([FromBody] SendFriendRequestRequest request) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        Guid toUser = Guid.Parse(request.ToUser);

        Result<SendFriendRequestResponse> result = await friendService.SendFriendRequestAsync(userId, toUser);

        if (result.IsSuccess) {
            return Ok();
        }

        return result.Error.Code switch {
            nameof(Errors.AlreadyFriended) => Conflict(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error))
        };
    }

    public record SendFriendRequestRequest(
        [Required(ErrorMessage = "Required"), StringFormat(StringFormat.Guid)] 
        string ToUser
    );
}