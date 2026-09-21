using Conflux.Application.Features.Users;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Conflux.WebApi.SignalR;
using Facet;
using Mediator;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Conflux.WebApi.Notifications.Users;

[Facet(typeof(UserPresenceChangedNotification), Include = [
    nameof(UserPresenceChangedNotification.UserId),
])]
public sealed partial record UserPresenceChangedEvent {
    [MapFrom(nameof(UserPresenceChangedNotification.NewStatus))]
    public PresenceStatus Status { get; set; } = Status;
}

internal sealed class UserPresenceChangedNotificationHandler(
    IHubContext<GatewayHub, IConfluxClient> hubContext,
    IFriendRequestRepository friendRequestRepository,
    ICommunityServerRepository communityServerRepository
) : INotificationHandler<UserPresenceChangedNotification> {
    private const int ServerBroadcastMemberThreshold = 1600;    // might put this in an option now.
    
    public async ValueTask Handle(UserPresenceChangedNotification notification, CancellationToken cancellationToken) {
        UserPresenceChangedEvent @event = new(notification);
        
        // broadcast the event to all user's friends.
        List<string> friendIds = await friendRequestRepository.AsQueryable()
            .Where(r => r.Status == FriendRequestStatus.Pending || r.Status == FriendRequestStatus.Accepted)
            .Where(r => r.ReceiverUserId == notification.UserId || r.SenderUserId == notification.UserId)
            .Select(r => r.SenderUserId == notification.UserId ? r.ReceiverUserId.ToString() : r.SenderUserId.ToString())
            .ToListAsync(cancellationToken);
        
        await hubContext.Clients
            .Users(friendIds)
            .PresenceUpdated(@event, cancellationToken);
        
        // server (this is not gonna scale well so imma do dirty trick by only broadcasting to server with member count below a certain threshold)
        
        // query user's joined servers along with member count.
        var userJoinedServersWithMemberCount = await communityServerRepository.AsQueryable()
            .Where(s => s.Members.Any(member => member.UserId == notification.UserId))
            .Select(s => new { s.Id, MemberCount = s.Members.Count })
            .ToListAsync(cancellationToken);
        
        var broadcastGroups = new List<string>();
        
        foreach (var server in userJoinedServersWithMemberCount) {
            if (server.MemberCount >= ServerBroadcastMemberThreshold) {
                continue; 
            }
            
            broadcastGroups.Add(NameProvider.GetServerGroupName(server.Id));
        }

        if (broadcastGroups.Count > 0) {
            await hubContext.Clients
                .Groups(broadcastGroups)
                .PresenceUpdated(@event, cancellationToken);
        }
    }
}