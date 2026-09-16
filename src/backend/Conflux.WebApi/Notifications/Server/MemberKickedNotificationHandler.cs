using Conflux.Application.Features.Servers;
using Conflux.Domain.Enums;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Server;

[Facet(typeof(ServerMemberKickedNotification), Include = [
    nameof(ServerMemberKickedNotification.ServerId),
    nameof(ServerMemberKickedNotification.KickedMemberUserId),
    nameof(ServerMemberKickedNotification.KickedMemberId),
])]
public sealed partial record ServerMemberKickedEvent;

internal sealed class MemberKickedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerMemberKickedNotification> {
    public async ValueTask Handle(ServerMemberKickedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        // broadcast the banned notification to the kicked user.
        await hubContext.Clients
            .User(notification.KickedMemberUserId.ToString())
            .KickedFromServer(notification.ServerId, cancellationToken);
        
        // broadcast the notification to members with ManageMembers role (except the executor connection).
        string groupName = NameProvider.GetServerPermissionGroupName(notification.ServerId, ServerPermission.ManageMembers);
        
        IConfluxClient target = string.IsNullOrEmpty(connectionId) ?
            hubContext.Clients.Group(groupName) :
            hubContext.Clients.GroupExcept(groupName, connectionId);
        
        await target.ServerMemberKicked(new(notification), cancellationToken);

        // broadcast the notification to update moderation log
        groupName = NameProvider.GetServerPermissionGroupName(notification.ServerId, ServerPermission.ReadModerationLogs);
        await hubContext.Clients
            .Group(groupName)
            .UpdateModerationLog(cancellationToken);
        
        // TODO: remove the user from the server groups
    }
}