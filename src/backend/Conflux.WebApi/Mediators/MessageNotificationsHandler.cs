using Conflux.Application.Dto.Notifications;
using Conflux.Application.Services;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Mediators;

public sealed class MessageNotificationsHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<MessageReceivedNotification>,
    INotificationHandler<MessageEditedNotification>,
    INotificationHandler<MessageDeletedNotification>,
    INotificationHandler<UpdateDmConversationListNotification>
{
    public async ValueTask Handle(MessageReceivedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group($"channel:{notification.ChannelId}")
            : hubContext.Clients.GroupExcept($"channel:{notification.ChannelId}", connectionId);
        
        await target.MessageReceived(new(notification.Message), cancellationToken);
    }

    public async ValueTask Handle(MessageEditedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group($"channel:{notification.ChannelId}")
            : hubContext.Clients.GroupExcept($"channel:{notification.ChannelId}", connectionId);
        
        await target.MessageEdited(new(notification.Message), cancellationToken);
    }

    public async ValueTask Handle(MessageDeletedNotification notification, CancellationToken cancellationToken) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();
        
        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group($"channel:{notification.ChannelId}")
            : hubContext.Clients.GroupExcept($"channel:{notification.ChannelId}", connectionId);
        
        await target.MessageDeleted(new(notification.MessageId), cancellationToken);
    }

    public async ValueTask Handle(UpdateDmConversationListNotification notification, CancellationToken cancellationToken) {
        await hubContext.Clients.User(notification.SenderUserId.ToString())
            .UpdateDmConversationList(new(notification.ChannelId, 0), cancellationToken);

        await hubContext.Clients.User(notification.ReceiverUserId.ToString())
            .UpdateDmConversationList(new(notification.ChannelId, 69), cancellationToken);
    }
}