using Conflux.Application.Features.Conversation;
using Conflux.Application.Services;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Notifications;

public sealed class PersistMentioningNotificationHandler(
    INotificationRepository notificationRepository,
    IUnitOfWork unitOfWork,
    ILogger<PersistMentioningNotificationHandler> logger
) : INotificationHandler<MentioningNotification> {
    public async ValueTask Handle(MentioningNotification notification, CancellationToken cancellationToken) {
        foreach (var userId in notification.MentioningUserIds) {
            Notification notif = new() {
                Type = NotificationType.Mention,
                UserId = userId,
                Payload = new MentionNotificationPayload(notification.Source),
            };
            
            notificationRepository.Add(notif);
        }

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while saving mentioning notifications for message {messageId}.", notification.Source.MessageId);
        }
    }
}