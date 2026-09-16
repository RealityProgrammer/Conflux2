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
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<ServerMemberBannedNotification> {
    public async ValueTask Handle(ServerMemberBannedNotification notification, CancellationToken cancellationToken) {
        // broadcast the banned notification to the banned user.
        await hubContext.Clients
            .User(notification.BannedMemberUserId.ToString())
            .BannedFromServer(notification.ServerId, cancellationToken);

        // broadcast the banned notification to whoever has the ability to view the server moderation log
        string groupName = NameProvider.GetServerPermissionGroupName(notification.ServerId, ServerPermission.ReadModerationLogs);
        
        await hubContext.Clients
            .Group(groupName)
            .ServerMemberBanned(new(notification), cancellationToken);
    }
}