using Conflux.Application.Dto;
using Conflux.Application.Features.Channels;
using Conflux.Application.Features.Friends;
using Conflux.Application.Features.Users;
using Conflux.Application.Options;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Humanizer;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/users/me")]
[Authorize]
public sealed class SessionUserController(
    IMediator mediator
) : ControllerBase {
    [HttpPost("avatar")]
    public async Task<ActionResult<ApiResponse>> UploadAvatar([FromForm] UploadAvatarRequest request) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var file = request.File;
        
        await using var fileStream = file.OpenReadStream();
        
        fileStream.Position = 0;
        var result = await mediator.Send(new UploadUserAvatarCommand(userId, fileStream));
        
        if (result.IsSuccess) {
            return Ok();
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse(result.Error)),
            
            nameof(Errors.ConnectionFailure) or nameof(Errors.InvalidCredentials) => 
                StatusCode(StatusCodes.Status503ServiceUnavailable, new ApiResponse(result.Error)),
            
            nameof(Errors.ValidationErrorsOccurred) =>
                BadRequest(new ApiResponse(result.Error)),
            
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error))
        };
    }
    
    [HttpDelete("avatar")]
    public async Task<ActionResult<ApiResponse>> DeleteAvatar() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await mediator.Send(new DeleteUserAvatarCommand(userId));
        
        if (result.IsSuccess) {
            return NoContent();
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NoContent(),
            nameof(Errors.NoUserFoundFromId) => BadRequest(result.Error),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error))
        };
    }
    
    [HttpPost("names")]
    public async Task<ActionResult<ApiResponse>> SetNames([FromBody] SetNamesRequest request) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        Result result = await mediator.Send(new SetUserNamesCommand(
            userId,
            request.UserName,
            request.DisplayName
        ));
        
        if (result.IsSuccess) {
            return Ok();
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("lock-name")]
    public async Task<ActionResult<ApiResponse>> LockName() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        Result result = await mediator.Send(new LockNameCommand(userId));
        
        if (result.IsSuccess) {
            return Ok();
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    // [HttpGet("dm")]
    // public async Task<ActionResult<ApiResponse<PaginatedResult<DmConversationListItemDto>>>> GetDirectMessageChannels(
    //     [FromQuery] int offset, 
    //     [FromQuery] int count
    // ) {
    //     var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
    //     
    //     if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
    //         return BadRequest(new ApiResponse<ChannelController.DirectMessageResolutionResponse>(null, Errors.InvalidIdentifier()));
    //     }
    //     
    //     offset = int.Max(offset, 0);
    //     count = int.Max(count, 1);
    //
    //     PaginatedResult<DmConversationListItemDto> result = await mediator.Send(
    //         new GetUserDmConversationsQuery(userId, offset, count)
    //     );
    //
    //     return Ok(new ApiResponse<PaginatedResult<DmConversationListItemDto>>(result, Error.None));
    // }
    
    [HttpGet("friends")]
    public async Task<ActionResult<ApiResponse<PaginatedResult<UserIdentityProfileDto>>>> GetFriends(
        [FromQuery] string? name,
        [FromQuery, Required] int offset,
        [FromQuery, Required] int count
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<UserIdentityProfileDto>(null, Errors.InvalidIdentifier()));
        }
        
        offset = int.Max(offset, 0);
        count = int.Max(count, 1);
        
        var result = await mediator.Send(new GetFriendsQuery(userId, name, offset, count));

        return Ok(new ApiResponse<PaginatedResult<UserIdentityProfileDto>>(result, Error.None));
    }

    public sealed record SetNamesRequest(
        [Required(ErrorMessage = "Username is required."), StringLength(32, MinimumLength = 8, ErrorMessage = "Username must be between 8 and 32 characters.")]
        string UserName,

        [Required(ErrorMessage = "Display name is required."), StringLength(32, MinimumLength = 8, ErrorMessage = "Display name must be between 8 and 32 characters.")]
        string DisplayName
    );
    
    public sealed record UploadAvatarRequest(IFormFile File) : IValidatableObject {
        public IEnumerable<ValidationResult> Validate(ValidationContext context) {
            if (File == null!) {
                yield return new("Avatar file is required.", [ nameof(File) ]);
            } else {
                var configuration = context.GetService<IConfiguration>()!;
                var options = configuration.GetSection("Services:User").Get<UserServiceOptions>()!;
                
                if (File.Length > options.MaxAvatarSizeBytes) {
                    yield return new($"Avatar must be smaller than {options.MaxAvatarSizeBytes.Bytes():MB}.", [ nameof(File) ]);
                }
            }
        }
    }

    [HttpGet("pending-requests")]
    public async Task<ActionResult<ApiResponse<PaginatedResult<PendingFriendRequestDto>>>> GetPendingFriendRequests(
        [FromQuery] string? name,
        [FromQuery, Required] int offset,
        [FromQuery, Required] int count
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<PendingFriendRequestDto>(null, Errors.InvalidIdentifier()));
        }
        
        offset = int.Max(offset, 0);
        count = int.Max(count, 1);
        
        var result = await mediator.Send(new GetPendingFriendRequestsQuery(userId, name, offset, count));

        return Ok(new ApiResponse<PaginatedResult<PendingFriendRequestDto>>(result, Error.None));
    }
}