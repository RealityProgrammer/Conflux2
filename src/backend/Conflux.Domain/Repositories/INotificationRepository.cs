using Conflux.Domain.Entities;
using Conflux.Domain.Enums;

namespace Conflux.Domain.Repositories;

public interface INotificationRepository : IRepository<Notification> {
    Task<int> GetUnreadNotificationsCount(Guid userId, CancellationToken cancellationToken = default);
    Task<int> GetUnreadNotificationsCount(NotificationType type, Guid userId, CancellationToken cancellationToken = default);
    
    Task<int> MarkMentionsAsReadAsync(Guid conversationId, Guid userId, CancellationToken cancellationToken);
    Task<int> PruneReadMentionNotifications(TimeSpan age, CancellationToken cancellationToken);
}