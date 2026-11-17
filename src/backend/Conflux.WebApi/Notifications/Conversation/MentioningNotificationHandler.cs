using Conflux.Application.Features.Conversation;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Conversation;

[Facet(typeof(MentioningNotification), Include = [
    nameof(MentioningNotification.Source),
])]
public sealed partial class MessageMentionReceivedData;

public sealed class MentioningNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<MentioningNotification> {
    public async ValueTask Handle(MentioningNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .Users(notification.MentioningUserIds.Select(uid => uid.ToString()))
            .MessageMentionReceived(new(notification), cancellationToken);
    }
}