using Conflux.Application.Commands;
using Conflux.Domain;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Collections.Frozen;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("/api/invite")]
[Authorize]
public sealed class InvitationController(
    IMediator mediator
) : ControllerBase {
    private static readonly FrozenDictionary<InvitationExpireAfter, TimeSpan?> ExpirationTimespanLookup = new Dictionary<InvitationExpireAfter, TimeSpan?> {
        [InvitationExpireAfter.FiveMinutes] = TimeSpan.FromMinutes(5),
        [InvitationExpireAfter.FifteenMinutes] = TimeSpan.FromMinutes(15),
        [InvitationExpireAfter.ThirtyMinutes] = TimeSpan.FromMinutes(30),
        [InvitationExpireAfter.OneHour] = TimeSpan.FromHours(1),
        [InvitationExpireAfter.TwoHours] = TimeSpan.FromHours(2),
        [InvitationExpireAfter.ThreeHours] = TimeSpan.FromHours(3),
        [InvitationExpireAfter.SixHours] = TimeSpan.FromHours(6),
        [InvitationExpireAfter.TwelveHours] = TimeSpan.FromHours(12),
        [InvitationExpireAfter.OneDay] = TimeSpan.FromDays(1),
        [InvitationExpireAfter.OneWeek] = TimeSpan.FromDays(7),
        [InvitationExpireAfter.TwoWeeks] = TimeSpan.FromDays(14),
        [InvitationExpireAfter.FourWeeks] = TimeSpan.FromDays(28),
        [InvitationExpireAfter.Infinite] = null,
    }.ToFrozenDictionary();
    
    [HttpPost]
    // [EnableRateLimiting("CreateServerInvitationPolicy")]
    public async Task<ActionResult<ApiResponse<string>>> CreateInvitation([FromBody] CreateInvitationRequest request) {
        var validDuration = ExpirationTimespanLookup.GetValueOrDefault(request.ExpireAfter, TimeSpan.FromMinutes(5));
        var result = await mediator.Send(new CreateInvitationCommand(request.ServerId, request.MaxUses, validDuration));
        
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
        [Range(1, 1000, ErrorMessage = "{0} must be between 1 to 1000, or be infinite.")] int? MaxUses,
        InvitationExpireAfter ExpireAfter
    );

    public enum InvitationExpireAfter {
        FiveMinutes,
        FifteenMinutes,
        ThirtyMinutes,
        OneHour,
        TwoHours,
        ThreeHours,
        SixHours,
        TwelveHours,
        OneDay,
        OneWeek,
        TwoWeeks,
        FourWeeks,
        Infinite,
    }
}