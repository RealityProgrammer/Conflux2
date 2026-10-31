using Conflux.Application.Features.Identity;
using Conflux.Application.Services;

namespace Conflux.Application.Notifications;

public sealed class SendConfirmationEmailOnRegisteredHandler(
    IAuthMailService authMailService
) : INotificationHandler<UserRegisteredNotification> {
    public async ValueTask Handle(
        UserRegisteredNotification notification, 
        CancellationToken cancellationToken
    ) {
        await authMailService.SendConfirmationEmail(notification.User, cancellationToken);
    }
}