using Conflux.Application.Dto;
using Conflux.Application.Features.Servers;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.WebApi.Attributes;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers.Server;

[ApiController, Route("api/communities/{serverId:guid}/roles"), Authorize]
public sealed class RoleController(
    ISender sender
) : ControllerBase {
    [HttpPost, Idempotent(30), ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse<ServerRoleDto>>> CreateRole(
        Guid serverId, 
        [FromBody] CreateRoleRequest request
    ) {
        var result = await sender.Send(new CreateServerRoleCommand(serverId, request.Name));
        
        if (result.IsSuccess) {
            return Created((Uri?)null, new ApiResponse<ServerRoleDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPatch("{roleId:guid}"), ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse<ServerRoleDto>>> UpdateRole(
        Guid serverId, 
        Guid roleId, 
        [FromBody] PatchRoleRequest request
    ) {
        var result = await sender.Send(new UpdateServerRoleCommand(
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
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpDelete("{roleId:guid}"), ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse>> DeleteRole(Guid serverId, Guid roleId) {
        var result = await sender.Send(new DeleteServerRoleCommand(serverId, roleId));
        
        if (result.IsSuccess) {
            return NoContent();
        }
        
        return result.Error.Code switch {
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    public sealed record CreateRoleRequest(
        [StringLength(32, ErrorMessage = "{0} can only have maximum length of {1} characters.")] string Name
    );

    public sealed record PatchRoleRequest(
        Facet.Optional<string> Name,
        Facet.Optional<int> AuthorizeLevel,
        IReadOnlyDictionary<ServerPermission, PermissionState> PermissionStates
    ) : IValidatableObject {
        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) {
            if (Name.HasValue) {
                if (string.IsNullOrEmpty(Name.Value)) {
                    yield return new("Name cannot be empty.", [nameof(Name)]);
                } else if (Name.Value.Length > 32) {
                    yield return new("Name can only have maximum length of 32 characters.", [nameof(Name)]);
                }
            }

            if (AuthorizeLevel is { HasValue: true, Value: < 0 or > 500000 }) {
                yield return new("Authorize Level must be between 0 and 500000.", [nameof(AuthorizeLevel)]);
            }
        }
    }
}