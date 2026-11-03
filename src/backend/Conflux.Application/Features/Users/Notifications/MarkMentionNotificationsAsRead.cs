using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Users.Notifications;

public sealed record MarkMentionNotificationsAsRead(
    Guid ConversationId
) : ICommand<Result>;

public sealed class MarkMentionNotificationsAsReadHandler(
    ICurrentUserService currentUserService,
    INotificationWriteRepository notificationWriteRepository
) : ICommandHandler<MarkMentionNotificationsAsRead, Result> {
    public async ValueTask<Result> Handle(
        MarkMentionNotificationsAsRead command, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        var conversationId = command.ConversationId;

        await notificationWriteRepository.MarkMentionsAsReadAsync(
            conversationId, 
            userId, 
            cancellationToken
        );

        return Result.Success();
    }
}