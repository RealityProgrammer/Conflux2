using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Users;

public sealed class QueryUnreadMentioningNotifications : IQuery<Result<IReadOnlyList<MentioningNotificationDto>>>;

public sealed class QueryUnreadMentioningNotificationsHandler(
    ICurrentUserService currentUserService,
    INotificationReadRepository notificationReadRepository,
    INotificationWriteRepository notificationWriteRepository
) : IQueryHandler<QueryUnreadMentioningNotifications, Result<IReadOnlyList<MentioningNotificationDto>>> {
    public async ValueTask<Result<IReadOnlyList<MentioningNotificationDto>>> Handle(
        QueryUnreadMentioningNotifications queryUnread, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        List<MentioningNotificationDto> list = await notificationReadRepository
            .AsQueryable()
            .Where(n => n.Type == NotificationType.Mention && n.UserId == userId)
            .Select(n => new MentioningNotificationDto(((MentionNotificationPayload)n.Payload).Source))
            .ToListAsync(cancellationToken);
        
        return Result<IReadOnlyList<MentioningNotificationDto>>.Success(list);
    }
}