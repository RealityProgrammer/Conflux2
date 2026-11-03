using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface INotificationWriteRepository : IWriteRepository<Notification> {
    Task<int> MarkMentionsAsReadAsync(Guid conversationId, Guid userId, CancellationToken cancellationToken);
}