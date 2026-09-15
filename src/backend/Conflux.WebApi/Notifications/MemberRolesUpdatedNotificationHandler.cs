using Conflux.Application.Features.Servers;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

[Facet(typeof(MemberRolesUpdatedNotification), Include = [
    nameof(MemberRolesUpdatedNotification.ServerId),
    nameof(MemberRolesUpdatedNotification.MemberUserId),
    nameof(MemberRolesUpdatedNotification.MemberId),
])]
public sealed partial record MemberRolesUpdatedEvent;

internal sealed class MemberRolesUpdatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<MemberRolesUpdatedNotification> {
    public async ValueTask Handle(MemberRolesUpdatedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group($"server:{notification.ServerId}")
            : hubContext.Clients.GroupExcept($"server:{notification.ServerId}", connectionId);
        
        await target.MemberRolesUpdated(new(notification), cancellationToken);
    }
}