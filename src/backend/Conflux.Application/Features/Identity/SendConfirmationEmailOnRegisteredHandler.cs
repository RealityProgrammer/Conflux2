using Conflux.Application.Services;

namespace Conflux.Application.Features.Identity;

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