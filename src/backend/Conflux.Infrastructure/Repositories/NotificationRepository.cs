using Conflux.Domain.Entities;
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
}