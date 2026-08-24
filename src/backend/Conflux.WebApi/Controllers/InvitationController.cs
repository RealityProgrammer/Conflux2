using Conflux.Application.Commands;
using Conflux.Domain;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("/api/invite")]
[Authorize]
public sealed class InvitationController(
    IMediator mediator
) : ControllerBase {
    [HttpPost]
    [EnableRateLimiting("CreateServerInvitationPolicy")]
    public async Task<ActionResult<ApiResponse<string>>> CreateInvitation([FromBody] CreateInvitationRequest request) {
        var result = await mediator.Send(new CreateInvitationCommand(request.ServerId, request.MaxUses, request.ValidDuration));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<string>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("{invitationId}/join")]
    public async Task<ActionResult<ApiResponse>> JoinServerWithInvitation(string invitationId) {
        var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return BadRequest(new ApiResponse(Errors.InvalidIdentifier()));
        }

        var result = await mediator.Send(new JoinServerWithInvitationCommand(userId, invitationId));

        if (result.IsSuccess) {
            return Ok();
        }

        var errorResponse = new ApiResponse(result.Error);

        return result.Error.Code switch {
            nameof(Errors.ResourceNotFound) => NotFound(errorResponse),
            nameof(Errors.ResourceExpired) => StatusCode(StatusCodes.Status410Gone, errorResponse),
            nameof(Errors.ResourceMaxUsed) => StatusCode(StatusCodes.Status410Gone, errorResponse),
            nameof(Errors.ResourceNoLongerValid) => StatusCode(StatusCodes.Status410Gone, errorResponse),
            nameof(Errors.AlreadyJoinedServer) => Conflict(errorResponse),
            _ => StatusCode(StatusCodes.Status500InternalServerError, errorResponse),
        };
    }

    public sealed record CreateInvitationRequest(
        Guid ServerId,
        int? MaxUses,
        TimeSpan? ValidDuration
    );
}