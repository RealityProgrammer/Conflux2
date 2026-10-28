using Conflux.Application.Features.Conversation;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Conversation;

[Facet(typeof(MessageUnpinnedNotification), Include = [
    nameof(MessageUnpinnedNotification.MessageId),
])]
public sealed partial record MessageUnpinnedEvent;

internal sealed class MessageUnpinnedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<MessageUnpinnedNotification> {
    public async ValueTask Handle(MessageUnpinnedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .Group(SignalRGroupNameProvider.GetConversationGroupName(notification.ConversationId))
            .MessageUnpinned(new(notification), cancellationToken);
    }
}