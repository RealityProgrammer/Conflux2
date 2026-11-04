using Conflux.Application.Features.Servers;
using Conflux.Domain;
using Mediator;
using Microsoft.AspNetCore.Mvc;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers.Server;

[ApiController, Route("api/communities/{serverId:guid}/members")]
public class ServerMemberController(
    ISender sender
) : ControllerBase {
    [HttpPatch("{userId:guid}/roles")]
    public async Task<ActionResult<ApiResponse>> UpdateMemberRoles(
        Guid serverId,
        Guid userId,
        [FromBody] UpdateMemberRolesRequest request
    ) {
        var result = await sender.Send(new UpdateMemberRolesCommand(serverId, userId, request.AddRoleIds, request.RemoveRoleIds));

        if (result.IsSuccess) {
            return Ok(new ApiResponse(Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) or nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    public sealed record UpdateMemberRolesRequest(
        IReadOnlyCollection<Guid> AddRoleIds, 
        IReadOnlyCollection<Guid> RemoveRoleIds
    );
}