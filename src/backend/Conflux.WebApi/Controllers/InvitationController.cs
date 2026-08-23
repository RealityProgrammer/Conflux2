using Conflux.Application.Commands;
using Conflux.Domain;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("/api/invite")]
[Authorize]
public sealed class InvitationController(
    IMediator mediator
) : ControllerBase {
    [HttpPost]
    public async Task<ActionResult<ApiResponse<string>>> CreateInvitation([FromBody] CreateInvitationCommand command) {
        var result = await mediator.Send(command);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<string>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse<string>(null, result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse<string>(null, result.Error)),
        };
    }
}