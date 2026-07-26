using Conflux.Application;
using Conflux.Application.Dto.Requests;
using Conflux.Application.Dto.Responses;
using Conflux.Application.Services;
using Conflux.Domain;
using Humanizer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/user")]
public sealed class UserController : ControllerBase {
    private readonly IUserService _userService;
    private readonly IConfiguration _config;

    public UserController(IUserService userService, IConfiguration config) {
        _userService = userService;
        _config = config;
    }
    
    [HttpPost("avatar")]
    [Authorize]
    public async Task<ActionResult<ApiResponse>> UploadAvatar([FromForm] UploadAvatarRequest request) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return Unauthorized();
        }
        
        var file = request.File;
        
        await using var fileStream = file.OpenReadStream();
        var result = await _userService.UploadAvatarAsync(userId, fileStream, file.ContentType);
        
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
    public async Task<ActionResult<ApiResponse<GetAvatarUrlResponse>>> GetAvatarUrl([FromQuery] string userId) {
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userIdGuid)) {
            return BadRequest(new ApiResponse<GetAvatarUrlResponse>(null, Errors.InvalidIdentifier()));
        }
        
        var result = _userService.GetAvatarUrl(userIdGuid, Request.IsHttps);
        return Redirect(result);
    }

    [HttpDelete("avatar")]
    [Authorize]
    public async Task<ActionResult<ApiResponse>> DeleteAvatar() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await _userService.DeleteAvatarAsync(userId);
        
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
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserBasicProfileResponse>>> GetSessionUserBasicProfile() {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<UserBasicProfileResponse>(null, Errors.InvalidIdentifier()));
        }
        
        Result<UserBasicProfileResponse> result = await _userService.GetUserBasicProfileAsync(userId);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<UserBasicProfileResponse>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.NoUserFoundFromId) => BadRequest(new ApiResponse<UserBasicProfileResponse>(null, result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<UserBasicProfileResponse>(null, result.Error)),
        };
    }

    [HttpPost("setup-profile")]
    [Authorize]
    public async Task<ActionResult<ApiResponse>> SetupProfile([FromForm] SetupProfileRequest request) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse<UserBasicProfileResponse>(null, Errors.InvalidIdentifier()));
        }

        await using var avatarFileStream = request.AvatarFile?.OpenReadStream() ?? Stream.Null;
        
        Result result = await _userService.SetupProfileAsync(new(
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
                if (!File.ContentType.StartsWith("image/")) {
                    yield return new("Avatar is not an image file.", [ nameof(File) ]);
                }

                ReadOnlySpan<char> subtype = File.ContentType.AsSpan(6);

                if (subtype is not "png" and not "jpeg") {
                    yield return new("Avatar is using unsupported format.", [ nameof(File) ]);
                }
                
                var configuration = context.GetRequiredService<IConfiguration>();
                
                long maxSize = configuration.GetValue<long>("Services:User:MaxAvatarSizeBytes", 1048576);

                if (File.Length > maxSize) {
                    yield return new($"Avatar must be smaller than {maxSize.Bytes():MB}.");
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