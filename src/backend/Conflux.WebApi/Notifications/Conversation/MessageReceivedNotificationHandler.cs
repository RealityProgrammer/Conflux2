using Conflux.Application.Features.Conversation;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications.Conversation;

[Facet(typeof(MessageReceivedNotification), Include = [nameof(MessageReceivedNotification.Message)])]
public sealed partial record MessageReceivedEvent;

internal sealed class MessageReceivedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<MessageReceivedNotification> {
    public async ValueTask Handle(MessageReceivedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        // if conversation type is Direct (or group in the future), dispatch message to user instead of group
        // if (notification.ConversationType is ConversationType.Direct) {
        //     MessageReceivedEvent @event = new(notification);
        //     
        //     foreach (var userId in notification.DirectConversationParticipantUserIds) {
        //         string userGroupName = NameProvider.GetUserGroupName(userId);
        //
        //         var userTarget = string.IsNullOrEmpty(connectionId)
        //             ? hubContext.Clients.Group(userGroupName)
        //             : hubContext.Clients.GroupExcept(userGroupName, connectionId);
        //
        //         await userTarget.MessageReceived(@event, cancellationToken);
        //     }
        // } else {
        //     string groupName = NameProvider.GetConversationGroupName(notification.ConversationId);
        //     
        //     var target = string.IsNullOrEmpty(connectionId)
        //         ? hubContext.Clients.Group(groupName)
        //         : hubContext.Clients.GroupExcept(groupName, connectionId);
        //     
        //     await target.MessageReceived(new(notification), cancellationToken);
        // }
        
        string groupName = NameProvider.GetConversationGroupName(notification.ConversationId);
        
        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group(groupName)
            : hubContext.Clients.GroupExcept(groupName, connectionId);
        
        await target.MessageReceived(new(notification), cancellationToken);
    }
}