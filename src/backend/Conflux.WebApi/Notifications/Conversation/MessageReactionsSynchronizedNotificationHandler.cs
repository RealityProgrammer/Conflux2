using Conflux.Application.Notifications;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Conversation;

public sealed record ReactionsCountsSynchronizedEvent(Guid ConversationId, IReadOnlyCollection<MessageItemReactionDto> Messages);
public sealed record ReactionsActionsSynchronizedEvent(IReadOnlyCollection<UserReactionActionDto> Actions);

internal sealed class MessageReactionsSynchronizedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<MessageReactionsSynchronizedNotification> {
    public async ValueTask Handle(MessageReactionsSynchronizedNotification notification, CancellationToken cancellationToken) {
        foreach ((Guid conversationId, MessageReactionSyncDto syncDto) in notification.SyncedMessages) {
            string conversationGroupName = SignalRGroupNameProvider.GetConversationGroupName(conversationId);

            await hubContext.Clients
                .Group(conversationGroupName)
                .ReactionsCountsSynchronized(new(conversationId, syncDto.Messages), cancellationToken);
        }

        foreach ((Guid userId, List<UserReactionActionDto> actions) in notification.UserActionsPerUser) {
            await hubContext.Clients
                .User(userId.ToString())
                .ReactionsActionsSynchronized(new(actions), cancellationToken);
        }
    }
}
