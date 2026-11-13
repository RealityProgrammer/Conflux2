using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Conflux.WebApi.Helpers;
using GreenDonut.Data;
using HotChocolate.Types.Pagination;
using Microsoft.EntityFrameworkCore;

namespace Conflux.WebApi.GraphQL.Queries;

[QueryType]
public static partial class NotificationQuery {
    public static async Task<Notification?> GetNotification(
        Guid id,
        QueryContext<Notification> queryContext,
        [Service] ICurrentUserService currentUserService,
        [Service] INotificationRepository notificationRepository,
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }

        return await notificationRepository
            .AsQueryable()
            .Where(n => n.Id == id && n.UserId == userId)
            .With(queryContext)
            .FirstOrDefaultAsync(cancellationToken);
    }
    
    [UseConnection(DefaultPageSize = 20, MaxPageSize = 50, IncludeTotalCount = true), UseFiltering]
    public static async Task<PageConnection<Notification>> GetNotifications(
        QueryContext<Notification> queryContext,
        PagingArguments pagingArgs,
        [Service] ICurrentUserService currentUserService,
        [Service] INotificationRepository notificationRepository,
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }
        
        return await notificationRepository
            .AsQueryable()
            .Where(n => n.UserId == userId)
            .With(queryContext)
            .OrderByDescending(n => n.CreatedAt)
            .ToPageAsync(pagingArgs, cancellationToken);
    }
}