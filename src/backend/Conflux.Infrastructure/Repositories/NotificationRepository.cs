using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class NotificationRepository(
    ApplicationDbContext dbContext,
    TimeProvider timeProvider
) : INotificationReadRepository, INotificationWriteRepository {
    public void Add(Notification value) {
        dbContext.Notifications.Add(value);
    }

    public IQueryable<Notification> AsQueryable() {
        return dbContext.Notifications;
    }

    public async Task<int> GetUnreadNotificationsCount(Guid userId, CancellationToken cancellationToken = default) {
        return await dbContext.Notifications
            .Where(n => !n.IsRead && n.UserId == userId)
            .CountAsync(cancellationToken);
    }

    public async Task<int> GetUnreadNotificationsCount(NotificationType type, Guid userId, CancellationToken cancellationToken) {
        return await dbContext.Notifications
            .Where(n => !n.IsRead && n.UserId == userId && n.Type == type)
            .CountAsync(cancellationToken);
    }

    public async Task<int> MarkMentionsAsReadAsync(Guid conversationId, Guid userId, CancellationToken cancellationToken) {
        var utcNow = timeProvider.GetUtcNow();
        
        return await dbContext.Notifications
            .Where(n => 
                n.Type == NotificationType.Mention && 
                ((MentionNotificationPayload)n.Payload).Source.Source.ConversationId == conversationId && 
                n.UserId == userId && 
                !n.IsRead
            )
            .ExecuteUpdateAsync(s => {
                s.SetProperty(n => n.IsRead, true);
                s.SetProperty(n => n.ReadAt, utcNow);
            }, cancellationToken);
    }

    public async Task<int> PruneReadMentionNotifications(TimeSpan age, CancellationToken cancellationToken) {
        var utcNow = timeProvider.GetUtcNow();
        
        return await dbContext.Notifications
            .Where(n => 
                n.Type == NotificationType.Mention && n.IsRead && (n.ReadAt == null || utcNow >= n.ReadAt + age)
            )
            .ExecuteDeleteAsync(cancellationToken);
    }
}