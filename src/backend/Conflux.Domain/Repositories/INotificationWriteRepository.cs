using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface INotificationWriteRepository : IWriteRepository<Notification> {
    Task MarkMentionsAsReadAsync(Guid userId, CancellationToken cancellationToken);
}