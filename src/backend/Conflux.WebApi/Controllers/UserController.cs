using Conflux.Application.Dto.Requests;
using Conflux.Application.Services;
using Conflux.Application.Services.Implementations;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Humanizer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/user")]
[Authorize]
public sealed class UserController(
    IUserService userService
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
        var result = await userService.UploadAvatarAsync(userId, fileStream);
        
        if (result.IsSuccess) {
            return Ok();
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse(result.Error)),
            
            nameof(Errors.ConnectionFailure) or nameof(Errors.InvalidCredentials) => 
                StatusCode(StatusCodes.Status503ServiceUnavailable, new ApiResponse(result.Error)),
            
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error))
        };
    }

    [HttpGet("avatar")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Client)]
    public async Task<ActionResult> GetAvatarUrl([FromQuery] string userId) {
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userIdGuid)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = userService.GetAvatarUrl(userIdGuid, Request.IsHttps);
        return Redirect(result);
    }

    [HttpDelete("avatar")]
    public async Task<ActionResult<ApiResponse>> DeleteAvatar() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await userService.DeleteAvatarAsync(userId);
        
        if (result.IsSuccess) {
            return NoContent();
        }

        switch (result.Error.Code) {
            case nameof(Errors.ResourceNotFound):
                return NoContent();
            
            case nameof(Errors.NoUserFoundFromId):
                return BadRequest(result.Error);
        }

        return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error));
    }

    [HttpGet("profile")]
    public async Task<ActionResult<ApiResponse<UserBasicProfileDto>>> GetSessionUserBasicProfile() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<UserBasicProfileDto>(null, Errors.InvalidIdentifier()));
        }
        
        var result = await userService.GetUserBasicProfileAsync(userId);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<UserBasicProfileDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse<UserBasicProfileDto>(null, result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<UserBasicProfileDto>(null, result.Error)),
        };
    }
    
    [HttpGet("{id:guid}/profile")]
    public async Task<ActionResult<ApiResponse<UserBasicProfileDto>>> GetUserBasicProfile(Guid id) {
        var result = await userService.GetUserBasicProfileAsync(id);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<UserBasicProfileDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse<UserBasicProfileDto>(null, result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<UserBasicProfileDto>(null, result.Error)),
        };
    }

    [HttpPost("setup-profile")]
    public async Task<ActionResult<ApiResponse>> SetupProfile([FromForm] SetupProfileRequest request) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<UserBasicProfileDto>(null, Errors.InvalidIdentifier()));
        }

        await using var avatarFileStream = request.AvatarFile?.OpenReadStream() ?? Stream.Null;
        
        Result result = await userService.SetupProfileAsync(new(
            userId,
            request.UserName,
            request.DisplayName,
            new(request.AvatarOperation, avatarFileStream, request.AvatarFile?.ContentType)
        ));
        
        if (result.IsSuccess) {
            return Ok();
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    public sealed record UploadAvatarRequest(IFormFile File) : IValidatableObject {
        public IEnumerable<ValidationResult> Validate(ValidationContext context) {
            if (File == null!) {
                yield return new("Avatar file is required.", [ nameof(File) ]);
            } else {
                var configuration = context.GetService<IConfiguration>()!;
                var options = configuration.GetSection("Services:User").Get<UserServiceOptions>()!;
                
                if (File.Length > options.MaxAvatarSizeBytes) {
                    yield return new($"Avatar must be smaller than {options.MaxAvatarSizeBytes.Bytes():MB}.");
                }
            }
        }
    }
    
    public sealed record GetAvatarUrlResponse(string? Url);

    public sealed record SetupProfileRequest(
        string UserName,
        string DisplayName,
        AvatarOperationType AvatarOperation,
        IFormFile? AvatarFile
    ) : IValidatableObject {
        public IEnumerable<ValidationResult> Validate(ValidationContext context) {
            if (string.IsNullOrEmpty(UserName)) {
                yield return new("Username is required.", [ nameof(UserName) ]);
            } else if (UserName.Length is < 8 or > 64) {
                yield return new("Username must be between 8 and 64 characters.", [ nameof(UserName) ]);
            }
            
            if (string.IsNullOrEmpty(DisplayName)) {
                yield return new("Display name is required.", [ nameof(DisplayName) ]);
            } else if (DisplayName.Length is < 8 or > 64) {
                yield return new("Display name must be between 8 and 64 characters.", [ nameof(DisplayName) ]);
            }

            if (AvatarOperation is not AvatarOperationType.NoMod and not AvatarOperationType.Set and not AvatarOperationType.Delete) {
                yield return new("Invalid avatar operation.", [ nameof(AvatarOperation) ]);
            }
            
            if (AvatarOperation == AvatarOperationType.Set) {
                if (AvatarFile == null) {
                    yield return new("Avatar file is required when setting.", [ nameof(AvatarFile) ]);
                } else {
                    if (!AvatarFile.ContentType.StartsWith("image/")) {
                        yield return new("Avatar file is not an image file.", [ nameof(AvatarFile) ]);
                    }

                    ReadOnlySpan<char> subtype = AvatarFile.ContentType.AsSpan(6);

                    if (subtype is not "png" and not "jpeg") {
                        yield return new("Avatar file is using unsupported format.", [ nameof(AvatarFile) ]);
                    }
                    
                    var configuration = context.GetRequiredService<IConfiguration>();
                    
                    long maxSize = configuration.GetValue<long>("Services:User:MaxAvatarSizeBytes", 1048576);

                    if (AvatarFile.Length > maxSize) {
                        yield return new($"Avatar file must be smaller than {maxSize.Bytes():MB}.", [ nameof(AvatarFile) ]);
                    }
                }
            }
        }
    }
}