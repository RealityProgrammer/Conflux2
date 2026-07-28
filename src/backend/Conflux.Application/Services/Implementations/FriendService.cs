using Conflux.Application.Dto;
using Conflux.Application.Dto.Notifications;
using Conflux.Application.Dto.Responses;
using Conflux.Domain;
using Conflux.Domain.Extensions;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using FriendRequestStatus = Conflux.Domain.FriendRequestStatus;

namespace Conflux.Application.Services.Implementations;

internal sealed class FriendService(
    IDbContextFactory<ApplicationDbContext> dbContextFactory,
    TimeProvider timeProvider,
    IMediator mediator
) : IFriendService {
    public async Task<Result<SendFriendRequestResponse>> SendFriendRequestAsync(Guid fromUserId, Guid toUserId) {
        if (fromUserId == toUserId) {
            return Errors.DisallowSelfAction("Self sending friend request is not allowed.");
        }
        
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        dbContext.ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
        
        // check if there was a friend request between 2 users
        // if it's status is None or Rejected, update to Pending with sender and receiver assigned accordingly.

        var existingRequest = await dbContext.FriendRequests
            .Where(r =>
                r.SenderUserId == fromUserId && r.ReceiverUserId == toUserId ||
                r.SenderUserId == toUserId && r.ReceiverUserId == fromUserId
            ).Select(r => new {
                r.Id,
                r.Status,
                r.SenderUserId,
            }).FirstOrDefaultAsync();

        if (existingRequest != null) {
            switch (existingRequest.Status) {
                case FriendRequestStatus.None or FriendRequestStatus.Rejected or FriendRequestStatus.Canceled:
                default:    // treat all other invalid states as stranger
                    // has friend request, but it has been in one of "stranger" states.
                    int numChanged = await dbContext.FriendRequests
                        .Where(r => r.Id == existingRequest.Id)
                        .ExecuteUpdateAsync(setter => {
                            setter
                                .SetProperty(r => r.SenderUserId, fromUserId)
                                .SetProperty(r => r.ReceiverUserId, toUserId)
                                .SetProperty(r => r.Status, FriendRequestStatus.Pending)
                                .SetProperty(r => r.UpdatedAt, utcNow);
                        });

                    if (numChanged == 1) {
                        await mediator.Publish(new FriendRequestSentNotification(fromUserId, toUserId));
                        
                        return Result<SendFriendRequestResponse>.Success(new(
                            UserRelationshipStatus.OutcomingRequest
                        ));
                    }
                    
                    return Errors.OperationFailure("send friend request");
                
                case FriendRequestStatus.Pending:
                    // idempotency: the user already requested to receiver
                    if (existingRequest.SenderUserId == fromUserId) {
                        return Result<SendFriendRequestResponse>.Success(new(
                            UserRelationshipStatus.OutcomingRequest
                        ));
                    }
                    
                    // this user send request to the receiver, but the receiver already sent a request to this
                    // user, thus auto accept friend request
                    await dbContext.FriendRequests
                        .Where(r => r.Id == existingRequest.Id)
                        .ExecuteUpdateAsync(setter => {
                            setter
                                .SetProperty(r => r.Status, FriendRequestStatus.Accepted)
                                .SetProperty(r => r.UpdatedAt, utcNow);
                        });

                    await mediator.Publish(new FriendRequestAcceptedNotification(fromUserId, toUserId));

                    return Result<SendFriendRequestResponse>.Success(new(
                        UserRelationshipStatus.Friended
                    ));
                
                case FriendRequestStatus.Accepted:
                    return Result<SendFriendRequestResponse>.Success(new(
                        UserRelationshipStatus.Friended
                    ));
            }
        }
        
        // create and add request
        FriendRequest newRequest = new() {
            SenderUserId = fromUserId,
            ReceiverUserId = toUserId,
            Status = FriendRequestStatus.Pending,
            CreatedAt = utcNow,
        };

        dbContext.FriendRequests.Add(newRequest);

        try {
            await dbContext.SaveChangesAsync();
            
            await mediator.Publish(new FriendRequestSentNotification(fromUserId, toUserId));
            
            return Result<SendFriendRequestResponse>.Success(new(
                UserRelationshipStatus.OutcomingRequest
            ));
        } catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation }) {
            // conflict, automatically friend if the existing is from the "toUser".
            
            // TODO: Not doing raw SQL query once EF supports returning clause.
            var updatedId = await dbContext.Database.SqlQuery<Guid>(
                $"""
                UPDATE "FriendRequests"
                SET "Status" = {(int)FriendRequestStatus.Accepted}, "UpdatedAt" = {utcNow}
                WHERE "SenderUserId" = {toUserId} AND "ReceiverUserId" = {fromUserId}
                RETURNING "Id"
                """).FirstOrDefaultAsync();

            if (updatedId != Guid.Empty) {
                await mediator.Publish(new FriendRequestAcceptedNotification(fromUserId, toUserId));
                
                return Result<SendFriendRequestResponse>.Success(new(
                    UserRelationshipStatus.Friended
                ));
            }
            
            // likely caused by the user sent the exact same request twice at the same time
            return Result<SendFriendRequestResponse>.Success(new(
                UserRelationshipStatus.OutcomingRequest
            ));
        }
    }

    public async Task<Result> CancelFriendRequestAsync(Guid senderUserId, Guid toUserId) {
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        dbContext.ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
        
        var existingRequest = await dbContext.FriendRequests
            .Where(r => 
                r.SenderUserId == senderUserId && r.ReceiverUserId == toUserId || 
                r.SenderUserId == toUserId && r.ReceiverUserId == toUserId
            )
            .Select(r => new {
                r.Id,
                r.Status,
                r.SenderUserId,
            })
            .FirstOrDefaultAsync();

        if (existingRequest == null) {
            return Errors.ResourceNotFound("Friend request");
        }

        if (existingRequest.SenderUserId != senderUserId) {
            return Errors.Unauthorized("Only the sender can cancel their own request.");
        }

        switch (existingRequest.Status) {
            case FriendRequestStatus.Canceled:
                // idempotency, already canceled, so return success
                return Result.Success();
            
            case FriendRequestStatus.Pending:
                // WHERE again to prevent concurrency issue, will return 0 changed if it happen
                int numChanged = await dbContext.FriendRequests
                    .Where(r => r.Id == existingRequest.Id && r.Status == FriendRequestStatus.Pending)
                    .ExecuteUpdateAsync(setter => setter
                        .SetProperty(r => r.Status, FriendRequestStatus.Canceled)
                        .SetProperty(r => r.UpdatedAt, utcNow)
                    );

                if (numChanged == 1) {
                    await mediator.Publish(new FriendRequestCanceledNotification(senderUserId, toUserId));
                    
                    return Result.Success();
                }

                return Errors.OperationFailure("cancel friend request due to state changed.");
            
            case FriendRequestStatus.Accepted:
                return Errors.AlreadyFriended();
            
            case FriendRequestStatus.Rejected:
                return Errors.FriendRequestRejected();
            
            // invalid status, or None will return resource not found.
            case FriendRequestStatus.None:
            default:
                return Errors.ResourceNotFound("Friend request");
        }
    }
    
    public async Task<Result> RejectFriendRequestAsync(Guid receiverUserId, Guid senderUserId) {
        // copy-paste from CancelFriendRequestAsync, future modification should be applied accordingly
        // if CancelFriendRequestAsync changes
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        dbContext.ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
        
        var existingRequest = await dbContext.FriendRequests
            .Where(r => 
                r.SenderUserId == receiverUserId && r.ReceiverUserId == senderUserId || 
                r.SenderUserId == senderUserId && r.ReceiverUserId == receiverUserId
            )
            .Select(r => new {
                r.Id,
                r.Status,
                r.ReceiverUserId,
            })
            .FirstOrDefaultAsync();

        if (existingRequest == null) {
            return Errors.ResourceNotFound("Friend request");
        }

        if (existingRequest.ReceiverUserId != receiverUserId) {
            return Errors.Unauthorized("Only the receiver can reject request.");
        }

        switch (existingRequest.Status) {
            case FriendRequestStatus.Rejected:
                // idempotency, already rejected, so return success
                return Result.Success();
            
            case FriendRequestStatus.Pending:
                // WHERE again to prevent concurrency issue, will return 0 changed if it happen
                int numChanged = await dbContext.FriendRequests
                    .Where(r => r.Id == existingRequest.Id && r.Status == FriendRequestStatus.Pending)
                    .ExecuteUpdateAsync(setter => setter
                        .SetProperty(r => r.Status, FriendRequestStatus.Rejected)
                        .SetProperty(r => r.UpdatedAt, utcNow)
                    );

                if (numChanged == 1) {
                    await mediator.Publish(new FriendRequestRejectedNotification(receiverUserId, senderUserId));
                    
                    return Result.Success();
                }

                return Errors.OperationFailure("reject friend request due to state changed.");
            
            case FriendRequestStatus.Accepted:
                return Errors.AlreadyFriended();
            
            case FriendRequestStatus.Canceled:
                return Errors.FriendRequestCanceled();
            
            // invalid status, or None will return resource not found.
            case FriendRequestStatus.None:
            default:
                return Errors.ResourceNotFound("Friend request");
        }
    }
    
    public async Task<Result> AcceptFriendRequestAsync(Guid receiverUserId, Guid senderUserId) {
        // copy-paste from RejectFriendRequestAsync, future modification should be applied accordingly
        // if CancelFriendRequestAsync changes
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        dbContext.ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
        
        var existingRequest = await dbContext.FriendRequests
            .Where(r => 
                r.SenderUserId == receiverUserId && r.ReceiverUserId == senderUserId || 
                r.SenderUserId == senderUserId && r.ReceiverUserId == receiverUserId
            )
            .Select(r => new {
                r.Id,
                r.Status,
                r.ReceiverUserId,
            })
            .FirstOrDefaultAsync();

        if (existingRequest == null) {
            return Errors.ResourceNotFound("Friend request");
        }

        if (existingRequest.ReceiverUserId != receiverUserId) {
            return Errors.Unauthorized("Only the receiver can accept request.");
        }

        switch (existingRequest.Status) {
            case FriendRequestStatus.Accepted:
                // idempotency, already friended, so return success
                return Result.Success();
            
            case FriendRequestStatus.Pending:
                // WHERE again to prevent concurrency issue, will return 0 changed if it happen
                int numChanged = await dbContext.FriendRequests
                    .Where(r => r.Id == existingRequest.Id && r.Status == FriendRequestStatus.Pending)
                    .ExecuteUpdateAsync(setter => setter
                        .SetProperty(r => r.Status, FriendRequestStatus.Accepted)
                        .SetProperty(r => r.UpdatedAt, utcNow)
                    );

                if (numChanged == 1) {
                    await mediator.Publish(new FriendRequestAcceptedNotification(receiverUserId, senderUserId));
                    
                    return Result.Success();
                }

                return Errors.OperationFailure("accept friend request due to state changed.");
            
            case FriendRequestStatus.Rejected:
                return Errors.FriendRequestRejected();
            
            case FriendRequestStatus.Canceled:
                return Errors.FriendRequestCanceled();
            
            // invalid status, or None will return resource not found.
            case FriendRequestStatus.None:
            default:
                return Errors.ResourceNotFound("Friend request");
        }
    }

    public async Task<Result> UnfriendAsync(Guid invokerUserId, Guid otherUserId) {
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        dbContext.ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
        
        var existingRequest = await dbContext.FriendRequests
            .Where(r => 
                r.SenderUserId == invokerUserId && r.ReceiverUserId == otherUserId || 
                r.SenderUserId == otherUserId && r.ReceiverUserId == invokerUserId
            )
            .Select(r => new {
                r.Id,
                r.Status,
                r.ReceiverUserId,
            })
            .FirstOrDefaultAsync();

        if (existingRequest == null) {
            return Errors.ResourceNotFound("Friend request");
        }

        if (existingRequest.Status != FriendRequestStatus.Accepted) {
            return Errors.NotFriend();
        }
        
        int numChanged = await dbContext.FriendRequests
            .Where(r => r.Id == existingRequest.Id && r.Status == FriendRequestStatus.Accepted)
            .ExecuteUpdateAsync(setter => setter
                .SetProperty(r => r.Status, FriendRequestStatus.None)
                .SetProperty(r => r.UpdatedAt, utcNow)
            );

        if (numChanged == 1) {
            await mediator.Publish(new UnfriendNotification(invokerUserId, otherUserId));
            
            return Result.Success();
        }

        return Errors.OperationFailure("unfriend due to state changed.");
    }
    
    public async Task<Result<PaginatedResponse<DiscoverFriendElement>>> DiscoverFriendsAsync(
        Guid searchingUserId,
        string? nameFilter, 
        int offset, 
        int count
    ) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        dbContext.ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;

        var queryable = dbContext.Users
            // ignore the user who requests the search and anyone who hasn't setup their profile
            .Where(u => u.Id != searchingUserId && u.IsProfileSetup)
            .NameContains(nameFilter);
        
        int totalCount = await queryable.CountAsync();
        List<DiscoverFriendElement> paginatedItems = await queryable
            .OrderBy(u => u.UserName)
            .Skip(offset)
            .Take(count)
            .Select(u => new DiscoverFriendElement(
                u.Id,
                u.UserName!, 
                u.DisplayName!, 
                u.HasAvatar,
                dbContext.FriendRequests
                    .Where(fr => 
                        (fr.SenderUserId == searchingUserId && fr.ReceiverUserId == u.Id || fr.SenderUserId == u.Id && fr.ReceiverUserId == searchingUserId) &&
                        // only care about active states, ignore canceled and rejected
                        (fr.Status == FriendRequestStatus.Pending || fr.Status == FriendRequestStatus.Accepted)
                    )
                    .Select(fr => 
                        fr.Status == FriendRequestStatus.Accepted ? UserRelationshipStatus.Friended :
                        fr.SenderUserId == searchingUserId ? UserRelationshipStatus.OutcomingRequest : 
                        UserRelationshipStatus.IncomingRequest
                    )
                    .FirstOrDefault()
            ))
            .ToListAsync();
        
        return Result<PaginatedResponse<DiscoverFriendElement>>.Success(new(paginatedItems, totalCount));
    }

    public async Task<Result<PaginatedResponse<QueryFriendElement>>> QueryFriendsAsync(
        Guid searchingUserId, 
        string? nameFilter, 
        int offset, 
        int count
    ) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        dbContext.ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;

        var acceptedRequestsQuery = dbContext.FriendRequests
            .Where(r => r.SenderUserId == searchingUserId || r.ReceiverUserId == searchingUserId)
            .Where(r => r.Status == FriendRequestStatus.Accepted)
            .Select(r => r.SenderUserId == searchingUserId ? r.Receiver : r.Sender)
            .NameContains(nameFilter);

        int totalCount = acceptedRequestsQuery.Count();
        var paginatedItems = await acceptedRequestsQuery
            .OrderBy(u => u.UserName)
            .Skip(offset)
            .Take(count)
            .Select(u => new QueryFriendElement(
                u.Id,
                u.UserName!,
                u.DisplayName!,
                u.HasAvatar
            ))
            .ToListAsync();
        
        return Result<PaginatedResponse<QueryFriendElement>>.Success(new(paginatedItems, totalCount));
    }

    public async Task<Result<PaginatedResponse<QueryPendingRequestElement>>> QueryPendingRequestsAsync(
        Guid searchingUserId, 
        string? nameFilter, 
        int offset, 
        int count
    ) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        dbContext.ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;

        var pendingRequestsQuery = dbContext.FriendRequests
            .Where(r => r.SenderUserId == searchingUserId || r.ReceiverUserId == searchingUserId)
            .Where(r => r.Status == FriendRequestStatus.Pending)
            .Select(r => new {
                Other = r.SenderUserId == searchingUserId ? r.Receiver : r.Sender,
                Request = r
            });

        if (!string.IsNullOrEmpty(nameFilter)) {
            var pattern = $"%{nameFilter}%";
            
            pendingRequestsQuery = pendingRequestsQuery
                .Where(t => 
                    t.Other.UserName != null && 
                    t.Other.DisplayName != null && 
                    (EF.Functions.ILike(t.Other.UserName, pattern) || EF.Functions.ILike(t.Other.DisplayName, pattern))
                );
        }
        
        int totalCount = pendingRequestsQuery.Count();
        var paginatedItems = await pendingRequestsQuery
            .OrderBy(t => t.Other.UserName)
            .Skip(offset)
            .Take(count)
            .Select(t => new QueryPendingRequestElement(
                t.Other.Id,
                t.Other.UserName!,
                t.Other.DisplayName!,
                t.Other.HasAvatar,
                t.Request.SenderUserId == searchingUserId ? 
                    UserRelationshipStatus.OutcomingRequest : 
                    UserRelationshipStatus.IncomingRequest
            ))
            .ToListAsync();
        
        return Result<PaginatedResponse<QueryPendingRequestElement>>.Success(new(paginatedItems, totalCount));
    }
}