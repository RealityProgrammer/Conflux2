using Conflux.Domain.Entities;
using Conflux.Domain.Enums;

namespace Conflux.Domain.Repositories;

public interface INotificationReadRepository : IReadRepository<Notification> {
    Task<int> GetUnreadNotificationsCount(Guid userId, CancellationToken cancellationToken = default);
    Task<int> GetUnreadNotificationsCount(NotificationType type, Guid userId, CancellationToken cancellationToken = default);
}