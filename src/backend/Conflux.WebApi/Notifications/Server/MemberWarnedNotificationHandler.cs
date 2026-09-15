using Conflux.Application.Features.Servers;
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
public sealed partial record ServerMemberUnbannedEvent;

internal sealed class MemberWarnedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor,
    UserConnectionTracker connectionTracker
) : INotificationHandler<ServerMemberWarnedNotification> {
    public async ValueTask Handle(ServerMemberWarnedNotification notification, CancellationToken cancellationToken) {
        
    }
}