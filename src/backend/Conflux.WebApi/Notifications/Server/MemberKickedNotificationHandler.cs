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
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<ServerMemberKickedNotification> {
    public async ValueTask Handle(ServerMemberKickedNotification notification, CancellationToken cancellationToken) {
        // broadcast the banned notification to the kicked user.
        await hubContext.Clients
            .User(notification.KickedMemberUserId.ToString())
            .KickedFromServer(notification.ServerId, cancellationToken);

        // broadcast the kicked notification to whoever has the ability to view the server moderation log
        string groupName = NameProvider.GetServerPermissionGroupName(notification.ServerId, ServerPermission.ReadModerationLogs);
        
        await hubContext.Clients
            .Group(groupName)
            .ServerMemberKicked(new(notification), cancellationToken);
        
        // TODO: remove the user from the server groups
    }
}