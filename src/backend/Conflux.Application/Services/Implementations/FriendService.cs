using Conflux.Application.Dto.Responses;
using Conflux.Domain;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Conflux.Application.Services.Implementations;

internal sealed class FriendService(
    IDbContextFactory<ApplicationDbContext> dbContextFactory,
    TimeProvider timeProvider
) : IFriendService {
    public async Task<Result<SendFriendRequestResponse>> SendFriendRequestAsync(Guid fromUser, Guid toUser) {
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();
        
        // check if there was a friend request between 2 users
        // if it's status is None or Rejected, update to Pending with sender and receiver assigned accordingly.

        var existingRequest = await dbContext.FriendRequests
            .Where(r =>
                r.SenderUserId == fromUser && r.ReceiverUserId == toUser ||
                r.SenderUserId == toUser && r.ReceiverUserId == fromUser
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
                                .SetProperty(r => r.SenderUserId, fromUser)
                                .SetProperty(r => r.ReceiverUserId, toUser)
                                .SetProperty(r => r.Status, FriendRequestStatus.Pending)
                                .SetProperty(r => r.UpdatedAt, utcNow);
                        });

                    if (numChanged == 1) {
                        return Result<SendFriendRequestResponse>.Success(new(SendFriendRequestResult.Requested));
                    }
                    
                    return Errors.OperationFailure("send friend request");
                
                case FriendRequestStatus.Pending:
                    // idempotency goes hard
                    if (existingRequest.SenderUserId == fromUser) {
                        return Result<SendFriendRequestResponse>.Success(new(SendFriendRequestResult.Requested));
                    }
                    
                    // auto accept friend request
                    await dbContext.FriendRequests
                        .Where(r => r.Id == existingRequest.Id)
                        .ExecuteUpdateAsync(setter => {
                            setter
                                .SetProperty(r => r.Status, FriendRequestStatus.Accepted)
                                .SetProperty(r => r.UpdatedAt, utcNow);
                        });

                    return Result<SendFriendRequestResponse>.Success(new(SendFriendRequestResult.Friended));
                
                case FriendRequestStatus.Accepted:
                    return Result<SendFriendRequestResponse>.Success(new(SendFriendRequestResult.Friended));
            }
        }
        
        // create and add request
        FriendRequest newRequest = new() {
            SenderUserId = fromUser,
            ReceiverUserId = toUser,
            Status = FriendRequestStatus.Pending,
            CreatedAt = utcNow,
        };

        dbContext.FriendRequests.Add(newRequest);

        try {
            await dbContext.SaveChangesAsync();
            return Result<SendFriendRequestResponse>.Success(new(SendFriendRequestResult.Requested));
        } catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation }) {
            // conflict, automatically friend if the existing is from the "toUser".
            await dbContext.FriendRequests
                .Where(r => r.SenderUserId == toUser && r.ReceiverUserId == fromUser)
                .ExecuteUpdateAsync(setter => {
                    setter
                        .SetProperty(r => r.Status, FriendRequestStatus.Accepted)
                        .SetProperty(r => r.UpdatedAt, utcNow);
                });
            
            return Result<SendFriendRequestResponse>.Success(new(SendFriendRequestResult.Friended));
        }
    }
}