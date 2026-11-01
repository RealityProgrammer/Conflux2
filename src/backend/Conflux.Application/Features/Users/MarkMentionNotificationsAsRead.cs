using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Users;

public sealed class MarkMentionNotificationsAsRead : ICommand<Result>;

public sealed class MarkMentionNotificationsAsReadHandler(
    ICurrentUserService currentUserService,
    INotificationWriteRepository notificationWriteRepository
) : ICommandHandler<MarkMentionNotificationsAsRead, Result> {
    public async ValueTask<Result> Handle(MarkMentionNotificationsAsRead command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        await notificationWriteRepository.MarkMentionsAsReadAsync(userId, cancellationToken);
        return Result.Success();
    }
}