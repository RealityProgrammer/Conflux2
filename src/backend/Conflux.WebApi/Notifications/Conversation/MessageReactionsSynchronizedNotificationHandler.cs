using Conflux.Application.Notifications;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Conversation;

public sealed record ReactionsCountsSynchronizedEvent(IReadOnlyCollection<MessageItemReactionDto> Messages);
public sealed record ReceiveMessageReactionsConfirmationEvent(IReadOnlyCollection<UserReactionActionDto> Actions);

internal sealed class MessageReactionsSynchronizedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext
) : INotificationHandler<MessageReactionsSynchronizedNotification> {
    public async ValueTask Handle(MessageReactionsSynchronizedNotification notification, CancellationToken cancellationToken) {
        foreach ((Guid conversationId, MessageReactionSyncDto syncDto) in notification.SyncedMessages) {
            string conversationGroupName = SignalRGroupNameProvider.GetConversationGroupName(conversationId);
            
            await hubContext.Clients
                .Group(conversationGroupName)
                .ReactionsCountsSynchronized(new(syncDto.Messages), cancellationToken);
        }
        
        foreach ((Guid userId, List<UserReactionActionDto> actions) in notification.UserActionsPerUser) {
            await hubContext.Clients
                .User(userId.ToString())
                .ReceiveMessageReactionsConfirmation(new(actions), cancellationToken);
        }
    }
}