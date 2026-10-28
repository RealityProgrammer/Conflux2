using Conflux.Application.Features.Conversation;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Conversation;

[Facet(typeof(MessagePinnedNotification), Include = [
    nameof(MessagePinnedNotification.Message),
])]
public sealed partial record MessagePinnedEvent;

internal sealed class MessagePinnedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<MessagePinnedNotification> {
    public async ValueTask Handle(MessagePinnedNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients
            .Group(SignalRGroupNameProvider.GetConversationGroupName(notification.ConversationId))
            .MessagePinned(new(notification), cancellationToken);
    }
}