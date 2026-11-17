using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Notifications;

public sealed class PruneReadMentionNotificationsCommand : ICommand;

public sealed class PruneReadMentionNotificationsHandler(
    TimeProvider timeProvider,
    INotificationRepository notificationRepository
) : ICommandHandler<PruneReadMentionNotificationsCommand> {
    private static readonly TimeSpan ExpirationTime = TimeSpan.FromDays(7);
    
    public async ValueTask<Unit> Handle(PruneReadMentionNotificationsCommand command, CancellationToken cancellationToken) {
        var utcNow = timeProvider.GetUtcNow();
        
        await notificationRepository
            .AsQueryable()
            .Where(n => 
                n.Type == NotificationType.Mention && n.IsRead && (n.ReadAt == null || utcNow >= n.ReadAt + ExpirationTime)
            )
            .ExecuteDeleteAsync(cancellationToken);

        return Unit.Value;
    }
}