using Conflux.Application.Features.Servers;
using Conflux.Application.Services;
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
    IHttpContextAccessor httpContextAccessor,
    IConnectionTracker connectionTracker
) : INotificationHandler<ServerMemberKickedNotification> {
    public async ValueTask Handle(ServerMemberKickedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        // broadcast the banned notification to the kicked user.
        await hubContext.Clients
            .User(notification.KickedMemberUserId.ToString())
            .KickedFromServer(notification.ServerId, cancellationToken);
        
        // remove the connections of kicked users from the server group
        if (await connectionTracker.GetConnections(notification.KickedMemberUserId) is { Count: > 0 } kickedUserConnectionIds) {
            var serverGroupName = SignalRGroupNameProvider.GetServerGroupName(notification.ServerId);
            
            foreach (var connection in kickedUserConnectionIds) {
                await hubContext.Groups.RemoveFromGroupAsync(
                    connection,
                    serverGroupName,
                    cancellationToken
                );
            }
        }
        
        // broadcast the notification to members with ManageMembers role (except the executor connection).
        string groupName = SignalRGroupNameProvider.GetServerPermissionGroupName(notification.ServerId, ServerPermission.ManageMembers);
        
        IConfluxClient target = string.IsNullOrEmpty(connectionId) ?
            hubContext.Clients.Group(groupName) :
            hubContext.Clients.GroupExcept(groupName, connectionId);
        
        await target.ServerMemberKicked(new(notification), cancellationToken);

        // broadcast the notification to update moderation log
        groupName = SignalRGroupNameProvider.GetServerPermissionGroupName(notification.ServerId, ServerPermission.ReadModerationLogs);
        await hubContext.Clients
            .Group(groupName)
            .UpdateModerationLog(cancellationToken);
        
        // TODO: remove the user from the server groups
    }
}