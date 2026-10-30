using Conflux.Application.Features.Conversation;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Conversation;

[Facet(typeof(MessageMentioningNotification), Include = [
    nameof(MessageMentioningNotification.MessageId),
])]
public sealed partial class MessageMentionReceivedData;

public sealed class MessageMentioningNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<MessageMentioningNotification> {
    public async ValueTask Handle(MessageMentioningNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .Users(notification.MentioningUserIds.Select(uid => uid.ToString()))
            .MessageMentionReceived(new(notification), cancellationToken);
    }
}