using Conflux.Application.Dto;
using Conflux.Application.Features.Users;
using Conflux.Application.Features.Users.Notifications;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers;

[ApiController, Route("/api/notifications"), Authorize]
public sealed class NotificationController(
    ISender sender
) : ControllerBase {
    [HttpPost("read-mentions")]
    public async Task<ActionResult<ApiResponse>> MarkMentionNotificationsAsRead(
        [FromBody] MarkMentionNotificationsAsReadRequest request
    ) {
        var result = await sender.Send(new MarkMentionNotificationsAsRead(request.ConversationId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse(Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpGet("unread-counts")]
    public async Task<ActionResult<ApiResponse<UnreadNotificationCounts>>> GetUnreadNotificationsCount() {
        var result = await sender.Send(new QueryUnreadNotificationCounts());

        if (result.IsSuccess) {
            return Ok(new ApiResponse<UnreadNotificationCounts>(result.Value!, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    public sealed record MarkMentionNotificationsAsReadRequest(Guid ConversationId);
}