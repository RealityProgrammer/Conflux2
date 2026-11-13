using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using System.Runtime.InteropServices;

namespace Conflux.Application.Features.Notifications;

public sealed class QueryUnreadNotificationCounts : IQuery<Result<UnreadNotificationCounts>>;

public sealed class QueryUnreadNotificationCountsHandler(
    ICurrentUserService currentUserService,
    INotificationRepository notificationRepository
) : IQueryHandler<QueryUnreadNotificationCounts, Result<UnreadNotificationCounts>> {
    public async ValueTask<Result<UnreadNotificationCounts>> Handle(
        QueryUnreadNotificationCounts query, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        var unreadNotifications = await notificationRepository
            .AsQueryable()
            .Where(n => !n.IsRead && n.UserId == userId)
            .Select(n => new {
                n.Type,
                n.Payload,
            })
            .ToListAsync(cancellationToken);

        Dictionary<Guid, int> dmMentionCounts = [];
        Dictionary<Guid, Dictionary<Guid, int>> serverChannelCounts = [];

        foreach (var unreadNotif in unreadNotifications) {
            if (unreadNotif.Type == NotificationType.Mention) {
                var mentionPayload = (MentionNotificationPayload)unreadNotif.Payload;

                switch (mentionPayload.Source.Source) {
                    case MentionFromDm mentionFromDm:
                        ref var count = ref CollectionsMarshal.GetValueRefOrAddDefault(dmMentionCounts, mentionFromDm.PeerUserId, out _);
                        count += 1;
                        break;

                    case MentionFromServer mentionFromServer:
                        if (!serverChannelCounts.TryGetValue(mentionFromServer.ServerId, out var channelDict)) {
                            channelDict = [];
                            serverChannelCounts[mentionFromServer.ServerId] = channelDict;
                        }

                        channelDict.TryGetValue(mentionFromServer.ChannelId, out int currentCount);
                        channelDict[mentionFromServer.ChannelId] = currentCount + 1;
                        break;
                }
            }
        }

        var serverNotifCounts = serverChannelCounts.ToDictionary(
            serverKvp => serverKvp.Key, 
            IReadOnlyDictionary<Guid, ServerChannelNotificationCounts> (serverKvp) => {
                var channels = serverKvp.Value.ToDictionary(
                    channelKvp => channelKvp.Key,
                    channelKvp => new ServerChannelNotificationCounts(channelKvp.Value)
                );

                return channels;
            }
        );

        UnreadNotificationCounts result = new(dmMentionCounts, serverNotifCounts);

        return Result<UnreadNotificationCounts>.Success(result);
    }
}