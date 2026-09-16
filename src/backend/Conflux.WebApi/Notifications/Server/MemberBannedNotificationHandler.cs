using Conflux.Application.Features.Servers;
using Conflux.Domain.Enums;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerMemberBannedNotification), Include = [
    nameof(ServerMemberBannedNotification.ServerId),
    nameof(ServerMemberBannedNotification.BannedMemberUserId),
    nameof(ServerMemberBannedNotification.BannedMemberId),
])]
public sealed partial record ServerMemberBannedEvent;

internal sealed class MemberBannedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerMemberBannedNotification> {
    public async ValueTask Handle(ServerMemberBannedNotification notification, CancellationToken cancellationToken) {
        // broadcast the banned notification to the banned user.
        await hubContext.Clients
            .User(notification.BannedMemberUserId.ToString())
            .BannedFromServer(notification.ServerId, cancellationToken);
        
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        // broadcast the banned notification to whoever has the ability to manage member
        string groupName = NameProvider.GetServerPermissionGroupName(notification.ServerId, ServerPermission.ManageMembers);

        IConfluxClient target = string.IsNullOrEmpty(connectionId) ?
            hubContext.Clients.Group(groupName) :
            hubContext.Clients.GroupExcept(groupName, connectionId);
        
        await target.ServerMemberBanned(new(notification), cancellationToken);
        
        // broadcast the notification to update moderation log
        groupName = NameProvider.GetServerPermissionGroupName(notification.ServerId, ServerPermission.ReadModerationLogs);
        await hubContext.Clients
            .Group(groupName)
            .UpdateModerationLog(cancellationToken);
    }
}