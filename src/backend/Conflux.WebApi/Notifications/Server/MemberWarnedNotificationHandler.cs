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
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<ServerMemberWarnedNotification> {
    public async ValueTask Handle(ServerMemberWarnedNotification notification, CancellationToken cancellationToken) {
        // broadcast the warned notification to whoever has the ability to view the server moderation log
        string groupName = NameProvider.GetServerPermissionGroupName(notification.ServerId, ServerPermission.ReadModerationLogs);
        
        await hubContext.Clients
            .Group(groupName)
            .ServerMemberWarned(new(notification), cancellationToken);
    }
}