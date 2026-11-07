using Conflux.Application.Dto;
using Conflux.Application.Features.Identity;
using Conflux.Application.Features.Users;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.WebApi.Dto;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController, Route("api/users/me"), Authorize]
public sealed class SessionUserController(
    ISender sender
) : ControllerBase {
    [HttpPost("avatar")]
    public async Task<ActionResult<ApiResponse<int>>> UploadAvatar([FromForm] UploadAvatarRequest request) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        await using var avatarStream = request.File.OpenReadStream();
        
        var result = await sender.Send(new UpdateProfileCommand(
            userId, 
            default,
            default,
            default,
            default,
            new(avatarStream),
            default
        ));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<int?>(result.Value!.AvatarVersion.Value!.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPost("names")]
    public async Task<ActionResult<ApiResponse>> SetNames([FromBody] SetNamesRequest request) {
        Result result = await sender.Send(new SetUserNamesCommand(
            request.UserName,
            request.DisplayName
        ));
        
        if (result.IsSuccess) {
            return Ok(new ApiResponse(Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("lock-name")]
    public async Task<ActionResult<ApiResponse>> LockName() {
        Result result = await sender.Send(new LockNameCommand());
        
        if (result.IsSuccess) {
            return Ok(new ApiResponse(Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPatch("profile")]
    public async Task<ActionResult<ApiResponse<UpdateProfileResult>>> UpdateProfile(
        [FromForm] UpdateProfileRequest request
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<PendingFriendRequestDto>(null, Errors.InvalidIdentifier()));
        }

        await using var avatarStream = request.Avatar.Type == FileOperationType.Set ? request.Avatar.File!.OpenReadStream() : Stream.Null;
        await using var bannerStream = request.Banner.Type == FileOperationType.Set ? request.Banner.File!.OpenReadStream() : Stream.Null;

        Facet.Optional<Stream?> avatarField = request.Avatar.Type switch {
            FileOperationType.Delete => new(null),
            FileOperationType.Set => new(avatarStream),
            _ => default,
        };
        
        Facet.Optional<Stream?> bannerField = request.Banner.Type switch {
            FileOperationType.Delete => new(null),
            FileOperationType.Set => new(bannerStream),
            _ => default,
        };
        
        var result = await sender.Send(new UpdateProfileCommand(
            userId, 
            request.DisplayName, 
            request.Pronouns, 
            request.Biography, 
            request.ManualPresenceStatus,
            avatarField,
            bannerField
        ));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<UpdateProfileResult>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpGet("deletion")]
    public async Task<ActionResult<ApiResponse<AccountDeletionStatusDto>>> GetAccountDeletionStatus() {
        var result = await sender.Send(new AccountDeletionStatusQuery());
        
        if (result.IsSuccess) {
            return Ok(new ApiResponse<AccountDeletionStatusDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoPendingAccountDeletion) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpGet("emojis/entries")]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<ServerEmojiGroupDto>>>> GetEmojiEntryGroups() {
        var result = await sender.Send(new QueryEmojiEntries());

        if (result.IsSuccess) {
            return Ok(new ApiResponse<IReadOnlyList<ServerEmojiGroupDto>>(result.Value!, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    public sealed record SetNamesRequest(
        [Required(ErrorMessage = "Username is required."), StringLength(32, MinimumLength = 8, ErrorMessage = "Username must be between 8 and 32 characters.")]
        string UserName,

        [Required(ErrorMessage = "Display name is required."), StringLength(48, MinimumLength = 8, ErrorMessage = "Display name must be between 8 and 48 characters.")]
        string DisplayName
    );

    public sealed record UploadAvatarRequest(IFormFile File);

    public sealed record UpdateProfileRequest(
        Facet.Optional<string> DisplayName,
        Facet.Optional<string> Pronouns,
        Facet.Optional<string> Biography,
        Facet.Optional<PresenceStatus> ManualPresenceStatus,
        AvatarOperationInput Avatar,
        AvatarOperationInput Banner
    );
}