using Conflux.Application.Features.Servers;
using Conflux.Domain.Enums;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerMemberWarnedNotification), Include = [
    nameof(ServerMemberWarnedNotification.ServerId),
    nameof(ServerMemberWarnedNotification.WarnedMemberUserId),
    nameof(ServerMemberWarnedNotification.WarnedMemberId),
])]
public sealed partial record ServerMemberWarnedEvent;

internal sealed class MemberWarnedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerMemberWarnedNotification> {
    public async ValueTask Handle(ServerMemberWarnedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        // broadcast the notification to whoever has the ability to manage member (except the executor connection).
        string groupName = NameProvider.GetServerPermissionGroupName(notification.ServerId, ServerPermission.ManageMembers);

        IConfluxClient target = string.IsNullOrEmpty(connectionId) ?
            hubContext.Clients.Group(groupName) :
            hubContext.Clients.GroupExcept(groupName, connectionId);
        
        await target.ServerMemberWarned(new(notification), cancellationToken);
        
        // broadcast the notification to update moderation log
        groupName = NameProvider.GetServerPermissionGroupName(notification.ServerId, ServerPermission.ReadModerationLogs);
        await hubContext.Clients
            .Group(groupName)
            .UpdateModerationLog(cancellationToken);
    }
}