using Conflux.Application.Features.Servers;
using Conflux.Domain.Dto;
using Conflux.WebApi.SignalR;
using Mediator;
using Microsoft.AspNetCore.SignalR;

namespace Conflux.WebApi.Notifications;

public sealed record ServerChannelCreatedEvent(Guid ServerId, ServerChannelIdentityDto Channel);

internal sealed class ServerChannelCreatedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IHttpContextAccessor httpContextAccessor
) : INotificationHandler<ServerChannelCreatedNotification> {
    public async ValueTask Handle(
        ServerChannelCreatedNotification notification, 
        CancellationToken cancellationToken
    ) {
        string? connectionId = 
            httpContextAccessor.HttpContext?.Request.Headers["X-SignalR-Connection-Id"].FirstOrDefault();

        var target = string.IsNullOrEmpty(connectionId)
            ? hubContext.Clients.Group($"server:{notification.ServerId}")
            : hubContext.Clients.GroupExcept($"server:{notification.ServerId}", connectionId);

        await target.ServerChannelCreated(new(notification.ServerId, notification.Channel), cancellationToken);
    }
}