using Conflux.Application.Features.Servers;
using Conflux.Domain.Enums;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerMemberUnbannedNotification), Include = [
    nameof(ServerMemberUnbannedNotification.ServerId),
    nameof(ServerMemberUnbannedNotification.UnbannedMemberUserId),
    nameof(ServerMemberUnbannedNotification.UnbannedMemberId),
])]
public sealed partial record ServerMemberUnbannedEvent;

internal sealed class MemberUnbannedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerMemberUnbannedNotification> {
    public async ValueTask Handle(ServerMemberUnbannedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        // broadcast the banned notification to the kicked user.
        await hubContext.Clients.User(notification.UnbannedMemberUserId.ToString()).UnbannedFromServer(notification.ServerId, cancellationToken);

        // broadcast the notification to whoever has the ability to manage member (except the executor connection).
        string groupName = NameProvider.GetServerPermissionGroupName(notification.ServerId, ServerPermission.ManageMembers);
        
        IConfluxClient target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group(groupName)
            : hubContext.Clients.GroupExcept(groupName, connectionId);
        
        await target.ServerMemberUnbanned(new(notification), cancellationToken);
        
        // broadcast the notification to update moderation log
        groupName = NameProvider.GetServerPermissionGroupName(notification.ServerId, ServerPermission.ReadModerationLogs);
        await hubContext.Clients
            .Group(groupName)
            .UpdateModerationLog(cancellationToken);
    }
}