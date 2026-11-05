using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface INotificationWriteRepository : IWriteRepository<Notification> {
    Task<int> MarkMentionsAsReadAsync(Guid conversationId, Guid userId, CancellationToken cancellationToken);

    Task<int> PruneReadMentionNotifications(TimeSpan age, CancellationToken cancellationToken);
}