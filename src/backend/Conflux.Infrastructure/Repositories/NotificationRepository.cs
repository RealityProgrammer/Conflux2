using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class NotificationRepository(
    ApplicationDbContext dbContext
) : INotificationReadRepository, INotificationWriteRepository {
    public void Add(Notification value) {
        dbContext.Notifications.Add(value);
    }

    public IQueryable<Notification> AsQueryable() {
        return dbContext.Notifications;
    }

    public async Task MarkMentionsAsReadAsync(Guid userId, CancellationToken cancellationToken) {
        await dbContext.Notifications
            .Where(n => n.Type == NotificationType.Mention && n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => {
                s.SetProperty(n => n.IsRead, true);
            }, cancellationToken);
    }
}