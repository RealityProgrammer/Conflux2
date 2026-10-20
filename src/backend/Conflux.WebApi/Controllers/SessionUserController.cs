using Conflux.Application.Dto;
using Conflux.Application.Features.Friends;
using Conflux.Application.Features.Identity;
using Conflux.Application.Features.Users;
using Conflux.Application.Options;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.WebApi.Attributes;
using Conflux.WebApi.Dto;
using Humanizer;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/users/me")]
[Authorize]
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
            new(avatarStream, true),
            default
        ));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<int?>(result.Value!.AvatarVersion.Value!.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpDelete("avatar")]
    public async Task<ActionResult<ApiResponse>> DeleteAvatar() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await sender.Send(new DeleteUserAvatarCommand(userId));
        
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
        Result result = await sender.Send(new SetUserNamesCommand(
            request.UserName,
            request.DisplayName
        ));
        
        if (result.IsSuccess) {
            return Ok(new ApiResponse(Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse(result.Error)),
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

        PatchField<Stream?> avatarField = request.Avatar.Type switch {
            FileOperationType.Delete => new(null, true),
            FileOperationType.Set => new(avatarStream, true),
            _ => default,
        };
        
        PatchField<Stream?> bannerField = request.Banner.Type switch {
            FileOperationType.Delete => new(null, true),
            FileOperationType.Set => new(bannerStream, true),
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
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpGet("deletion")]
    public async Task<ActionResult<ApiResponse<AccountDeletionStatus>>> GetAccountDeletionStatus() {
        var result = await sender.Send(new AccountDeletionStatusQuery());
        
        if (result.IsSuccess) {
            return Ok(new ApiResponse<AccountDeletionStatus>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoPendingAccountDeletion) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    public sealed record SetNamesRequest(
        [Required(ErrorMessage = "Username is required."), StringLength(32, MinimumLength = 8, ErrorMessage = "Username must be between 8 and 32 characters.")]
        string UserName,

        [Required(ErrorMessage = "Display name is required."), StringLength(48, MinimumLength = 8, ErrorMessage = "Display name must be between 8 and 48 characters.")]
        string DisplayName
    );
    
    public sealed record UploadAvatarRequest(IFormFile File) : IValidatableObject {
        public IEnumerable<ValidationResult> Validate(ValidationContext context) {
            if (File == null!) {
                yield return new("Avatar file is required.", [ nameof(File) ]);
            } else {
                var options = context.GetRequiredService<IOptions<MediaOptions>>().Value;
                
                if (File.Length > options.MaxAvatarSize) {
                    yield return new($"Avatar must be smaller than {options.MaxAvatarSize.Bytes():MB}.", [ nameof(File) ]);
                }
            }
        }
    }

    public sealed record UpdateProfileRequest(
        PatchField<string> DisplayName,
        PatchField<string> Pronouns,
        PatchField<string> Biography,
        PatchField<PresenceStatus> ManualPresenceStatus,
        AvatarOperationInput Avatar,
        AvatarOperationInput Banner
    ) : IValidatableObject {
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) {
            List<ValidationResult> results = [];
            
            if (DisplayName.IsSet) {
                string displayName = DisplayName.Value;

                if (string.IsNullOrEmpty(displayName)) {
                    results.Add(new("Display name is not empty or nullable.", [nameof(DisplayName)]));
                } else if (displayName.Length > 32) {
                    results.Add(new("Display name can only have maximum length of 32 characters.", [nameof(DisplayName)]));
                }
            }

            if (Pronouns is { IsSet: true, Value.Length: > 32 }) {
                results.Add(new("Pronouns can only have maximum length of 32 characters.", [nameof(Pronouns)]));
            }
            
            if (Biography is { IsSet: true, Value.Length: > 255 }) {
                results.Add(new("Biography can only have maximum length of 255 characters.", [nameof(Biography)]));
            }

            if (ManualPresenceStatus.IsSet && !Enum.IsDefined(ManualPresenceStatus.Value)) {
                results.Add(new("Undefined PresenceStatus value.", [nameof(ManualPresenceStatus)]));
            }

            var options = validationContext.GetRequiredService<IOptions<MediaOptions>>().Value;

            if (Avatar.Type == FileOperationType.Set) {
                if (Avatar.File is { } avatarFile) {
                    if (avatarFile.Length > options.MaxAvatarSize) {
                        results.Add(new($"Avatar must be smaller than {options.MaxAvatarSize.Bytes():MB}.", [nameof(Avatar)]));
                    }
                } else {
                    results.Add(new("Avatar is required for Set operation.", [nameof(Avatar)]));
                }
            }

            if (Banner.Type == FileOperationType.Set) {
                if (Banner.File is { } avatarFile) {
                    if (avatarFile.Length > options.MaxBannerSize) {
                        results.Add(new($"Banner must be smaller than {options.MaxBannerSize.Bytes():MB}.", [nameof(Banner)]));
                    }
                } else {
                    results.Add(new("Banner is required for Set operation.", [nameof(Banner)]));
                }
            }

            return results;
        }
    }

    public sealed record DeleteAccountRequest(
        [Required] UserAccountDeleteReason Reason, 
        [MaxLength(255)] string? ExtraMessage
    );
}