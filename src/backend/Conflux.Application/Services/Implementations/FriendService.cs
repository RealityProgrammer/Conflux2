using Conflux.Application.Dto.Responses;
using Conflux.Domain;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Conflux.Application.Services.Implementations;

internal sealed class FriendService(
    IDbContextFactory<ApplicationDbContext> dbContextFactory,
    TimeProvider timeProvider
) : IFriendService {
    public async Task<Result<SendFriendRequestResponse>> SendFriendRequestAsync(Guid fromUserId, Guid toUserId) {
        if (fromUserId == toUserId) {
            return Errors.DisallowSelfAction("Self sending friend request is not allowed.");
        }
        
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        
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
                        return Result<SendFriendRequestResponse>.Success(new(
                            existingRequest.Id, 
                            SendFriendRequestResult.Requested
                        ));
                    }
                    
                    return Errors.OperationFailure("send friend request");
                
                case FriendRequestStatus.Pending:
                    // idempotency goes hard
                    if (existingRequest.SenderUserId == fromUserId) {
                        return Result<SendFriendRequestResponse>.Success(new(
                            existingRequest.Id,
                            SendFriendRequestResult.Requested
                        ));
                    }
                    
                    // auto accept friend request
                    await dbContext.FriendRequests
                        .Where(r => r.Id == existingRequest.Id)
                        .ExecuteUpdateAsync(setter => {
                            setter
                                .SetProperty(r => r.Status, FriendRequestStatus.Accepted)
                                .SetProperty(r => r.UpdatedAt, utcNow);
                        });

                    return Result<SendFriendRequestResponse>.Success(new(
                        existingRequest.Id,
                        SendFriendRequestResult.Friended
                    ));
                
                case FriendRequestStatus.Accepted:
                    return Result<SendFriendRequestResponse>.Success(new(
                        existingRequest.Id,
                        SendFriendRequestResult.Friended
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
            return Result<SendFriendRequestResponse>.Success(new(
                newRequest.Id,
                SendFriendRequestResult.Requested
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
                return Result<SendFriendRequestResponse>.Success(new(
                    updatedId, 
                    SendFriendRequestResult.Friended
                ));
            }
            
            // likely caused by the user sent the exact same request twice at the same time
            return Result<SendFriendRequestResponse>.Success(new(
                Guid.Empty, 
                SendFriendRequestResult.Requested
            ));
        }
    }

    public async Task<Result> CancelFriendRequestAsync(Guid senderUserId, Guid friendRequestId) {
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        
        var existingRequest = await dbContext.FriendRequests
            .Where(r => r.Id == friendRequestId)
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
                    .Where(r => r.Id == friendRequestId && r.Status == FriendRequestStatus.Pending)
                    .ExecuteUpdateAsync(setter => setter
                        .SetProperty(r => r.Status, FriendRequestStatus.Canceled)
                        .SetProperty(r => r.UpdatedAt, utcNow)
                    );

                if (numChanged == 1) {
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
    
    public async Task<Result> RejectFriendRequestAsync(Guid receiverUserId, Guid friendRequestId) {
        // copy-paste from CancelFriendRequestAsync, future modification should be applied accordingly
        // if CancelFriendRequestAsync changes
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        
        var existingRequest = await dbContext.FriendRequests
            .Where(r => r.Id == friendRequestId)
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
            return Errors.Unauthorized("Only the receiver can cancel their own request.");
        }

        switch (existingRequest.Status) {
            case FriendRequestStatus.Rejected:
                // idempotency, already canceled, so return success
                return Result.Success();
            
            case FriendRequestStatus.Pending:
                // WHERE again to prevent concurrency issue, will return 0 changed if it happen
                int numChanged = await dbContext.FriendRequests
                    .Where(r => r.Id == friendRequestId && r.Status == FriendRequestStatus.Pending)
                    .ExecuteUpdateAsync(setter => setter
                        .SetProperty(r => r.Status, FriendRequestStatus.Rejected)
                        .SetProperty(r => r.UpdatedAt, utcNow)
                    );

                if (numChanged == 1) {
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
}