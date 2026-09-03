using Conflux.Application.Dto;
using Conflux.Application.Enums;
using Conflux.Application.Features.Servers;
using Conflux.Application.Options;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.WebApi.Attributes;
using Humanizer;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/communities")]
[Authorize]
public sealed class CommunityServerController(
    IMediator mediator,
    IBlobUrlProvider blobUrlProvider
) : ControllerBase {
    [HttpPost]
    [Idempotent(360)]
    public async Task<ActionResult<ApiResponse<ServerIdentityDto>>> CreateCommunityServer([FromForm] CreateServerRequest serverRequest) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        await using var stream = serverRequest.Avatar?.OpenReadStream();
        var result = await mediator.Send(new CreateServerCommand(userId, serverRequest.Name, stream));
        
        if (result.IsSuccess) {
            return Created((Uri?)null, new ApiResponse<ServerIdentityDto>(result.Value, Error.None));
        }
        
        return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error));
    }
    
    [HttpGet("{serverId:guid}/avatar")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Client)]
    public RedirectResult GetAvatarUrl(Guid serverId) {
        return Redirect(blobUrlProvider.GetCommunityServerAvatarPreSignedUrl(serverId));
    }

    [HttpGet("{serverId:guid}/summary")]
    public async Task<ActionResult<ApiResponse<ServerDetailDto>>> GetSummary(Guid serverId) {
        var result = await mediator.Send(new GetServerSummaryQuery(serverId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<ServerDetailDto>(result.Value!, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("{serverId:guid}/channel-categories")]
    [Idempotent(15)]
    public async Task<ActionResult<ApiResponse<ChannelCategoryIdentityDto>>> CreateChannelCategory(
        Guid serverId, 
        [FromBody] ChannelCategoryCreateRequest request
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        var result = await mediator.Send(new CreateServerChannelCategoryCommand(userId, serverId, request.Name));

        if (result.IsSuccess) {
            return Created((Uri?)null, new ApiResponse<ChannelCategoryIdentityDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.ValidationErrorsOccurred) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("{serverId:guid}/channels")]
    [Idempotent(15)]
    public async Task<ActionResult<ApiResponse<ServerChannelIdentityDto>>> CreateChannels(
        Guid serverId,
        [FromBody] ChannelCreateRequest request
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        var result = await mediator.Send(new CreateServerChannelCommand(
            userId, 
            serverId, 
            request.Name, 
            request.Type, 
            request.CategoryId
        ));
        
        if (result.IsSuccess) {
            return Created((Uri?)null, new ApiResponse<ServerChannelIdentityDto>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ValidationErrorsOccurred) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpDelete("{serverId:guid}/channel-categories/{categoryId:guid}")]
    public async Task<ActionResult> DeleteChannelCategory(Guid serverId, Guid categoryId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await mediator.Send(new DeleteServerChannelCategoryCommand(userId, serverId, categoryId));
        
        if (result.IsSuccess) {
            return NoContent();
        }
        
        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpDelete("{serverId:guid}/channels/{channelId:guid}")]
    public async Task<ActionResult> DeleteChannel(Guid serverId, Guid channelId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await mediator.Send(new DeleteServerChannelCommand(userId, serverId, channelId));
        
        if (result.IsSuccess) {
            return NoContent();
        }
        
        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("{serverId:guid}/roles")]
    [Idempotent(30)]
    public async Task<ActionResult<ApiResponse<ServerRoleDto>>> CreateRole(Guid serverId, [FromBody] CreateRoleRequest request) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await mediator.Send(new CreateServerRoleCommand(userId, serverId, request.Name));
        
        if (result.IsSuccess) {
            return Created((Uri?)null, new ApiResponse<ServerRoleDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPatch("{serverId:guid}/roles/{roleId:guid}")]
    public async Task<ActionResult<ApiResponse<ServerRoleDto>>> UpdateRoles(
        Guid serverId, 
        Guid roleId, 
        [FromBody] PatchRoleRequest request
    ) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await mediator.Send(new UpdateServerRoleCommand(
            userId, 
            serverId, 
            roleId,
            request.Name,
            request.AuthorizeLevel,
            request.PermissionStates
        ));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<ServerRoleDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => Unauthorized(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpDelete("{serverId:guid}/roles/{roleId:guid}")]
    public async Task<ActionResult> DeleteRole(Guid serverId, Guid roleId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }
        
        var result = await mediator.Send(new DeleteServerRoleCommand(userId, serverId, roleId));
        
        if (result.IsSuccess) {
            return NoContent();
        }
        
        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpGet("{serverId:guid}/members/me/permissions")]
    public async Task<ActionResult<ApiResponse<ServerMemberPermissionsDto>>> GetSessionUserPermissions(Guid serverId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        return await InternalGetUserPermissions(serverId, userId);
    }
    
    [HttpGet("{serverId:guid}/members/{userId:guid}/permissions")]
    public async Task<ActionResult<ApiResponse<ServerMemberPermissionsDto>>> GetUserPermissions(Guid serverId, Guid userId) {
        return await InternalGetUserPermissions(serverId, userId);
    }

    private async Task<ActionResult<ApiResponse<ServerMemberPermissionsDto>>> InternalGetUserPermissions(Guid serverId, Guid userId) {
        var result = await mediator.Send(new GetUserServerPermissionsQuery(serverId, userId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<ServerMemberPermissionsDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    public sealed record CreateServerRequest(
        [Required] string Name, 
        IFormFile? Avatar
    ) : IValidatableObject {
        public IEnumerable<ValidationResult> Validate(ValidationContext context) {
            var results = new List<ValidationResult>();

            if (Name.Length > 48) {
                results.Add(new(
                    "Name can only have maximum length of 48 characters.", 
                    [nameof(Name)]
                ));
            }
            
            var options = context.GetRequiredService<IOptions<CommunityServerServiceOptions>>().Value;
                
            if (Avatar != null && Avatar.Length > options.MaxAvatarSizeBytes) {
                results.Add(new(
                    $"Avatar must be smaller than {options.MaxAvatarSizeBytes.Bytes():MB}.", 
                    [nameof(Avatar)]
                ));
            }

            return results;
        }
    }

    public sealed record ChannelCategoryCreateRequest(
        [StringLength(32, ErrorMessage = "{0} can only have maximum length of {1} characters.")] string Name
    );

    public sealed record ChannelCreateRequest(
        [StringLength(32, ErrorMessage = "{0} can only have maximum length of {1} characters.")] string Name,
        CommunityServerChannelType Type,
        Guid? CategoryId
    );

    public sealed record CreateRoleRequest(
        [StringLength(32, ErrorMessage = "{0} can only have maximum length of {1} characters.")] string Name
    );

    public sealed record PatchRoleRequest(
        PatchField<string> Name,
        PatchField<int> AuthorizeLevel,
        Dictionary<ServerPermission, PermissionState>? PermissionStates
    ) : IValidatableObject {
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) {
            if (Name.IsSet) {
                if (string.IsNullOrEmpty(Name.Value)) {
                    yield return new("Name cannot be empty.", [nameof(Name)]);
                } else if (Name.Value.Length > 32) {
                    yield return new("Name can only have maximum length of 32 characters.", [nameof(Name)]);
                }
            }

            if (AuthorizeLevel is { IsSet: true, Value: <= 0 or > 500000 }) {
                yield return new("Authorize Level must be between 1 and 500000.", [nameof(AuthorizeLevel)]);
            }
        }
    }
}