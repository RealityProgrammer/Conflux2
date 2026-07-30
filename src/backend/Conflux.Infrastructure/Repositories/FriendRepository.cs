using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Extensions;
using Conflux.Domain.Repositories;
using Npgsql;

namespace Conflux.Infrastructure.Repositories;

internal sealed class FriendRepository(
    ApplicationDbContext dbContext
) : IFriendRepository {
    public async Task<FriendRequestSummary?> GetRequestSummaryAsync(Guid user1, Guid user2) {
        return await dbContext.FriendRequests
            .Where(r =>
                r.SenderUserId == user1 && r.ReceiverUserId == user2 ||
                r.SenderUserId == user2 && r.ReceiverUserId == user1
            )
            .Select(r => new FriendRequestSummary(r.Id, r.Status, r.SenderUserId))
            .FirstOrDefaultAsync();
    }

    public async Task<bool> ReactivateRequestAsPendingAsync(
        Guid requestId,
        Guid senderUserId,
        Guid receiverUserId,
        DateTimeOffset utcTime,
        CancellationToken cancellationToken = default
    ) {
        // we could check for the status too but not to make it idempotent.
        int numChanged = await dbContext.FriendRequests
            .Where(r => r.Id == requestId)
            .ExecuteUpdateAsync(setter => {
                setter
                    .SetProperty(r => r.SenderUserId, senderUserId)
                    .SetProperty(r => r.ReceiverUserId, receiverUserId)
                    .SetProperty(r => r.Status, FriendRequestStatus.Pending)
                    .SetProperty(r => r.UpdatedAt, utcTime);
            }, cancellationToken);

        return numChanged > 0;
    }

    public async Task<bool> AcceptRequestAsync(
        Guid requestId, 
        DateTimeOffset utcTime,
        CancellationToken cancellationToken = default
    ) {
        int numChanged = await dbContext.FriendRequests
            .Where(r => r.Id == requestId)
            .ExecuteUpdateAsync(setter => {
                setter
                    .SetProperty(r => r.Status, FriendRequestStatus.Accepted)
                    .SetProperty(r => r.UpdatedAt, utcTime);
            }, cancellationToken);

        return numChanged > 0;
    }

    public async Task<bool> CancelRequestAsync(Guid requestId, DateTimeOffset utcTime, CancellationToken cancellationToken = default) {
        int numChanged = await dbContext.FriendRequests
            .Where(r => r.Id == requestId && r.Status == FriendRequestStatus.Pending)
            .ExecuteUpdateAsync(setter => {
                setter
                    .SetProperty(r => r.Status, FriendRequestStatus.Canceled)
                    .SetProperty(r => r.UpdatedAt, utcTime);
            }, cancellationToken);

        return numChanged > 0;
    }

    public async Task<bool> RejectRequestAsync(Guid requestId, DateTimeOffset utcTime, CancellationToken cancellationToken = default) {
        int numChanged = await dbContext.FriendRequests
            .Where(r => r.Id == requestId && r.Status == FriendRequestStatus.Pending)
            .ExecuteUpdateAsync(setter => {
                setter
                    .SetProperty(r => r.Status, FriendRequestStatus.Rejected)
                    .SetProperty(r => r.UpdatedAt, utcTime);
            }, cancellationToken);

        return numChanged > 0;
    }

    public async Task<bool> UnfriendAsync(Guid requestId, DateTimeOffset utcTime, CancellationToken cancellationToken = default) {
        int numChanged = await dbContext.FriendRequests
            .Where(r => r.Id == requestId && r.Status == FriendRequestStatus.Accepted)
            .ExecuteUpdateAsync(setter => {
                setter
                    .SetProperty(r => r.Status, FriendRequestStatus.None)
                    .SetProperty(r => r.UpdatedAt, utcTime);
            }, cancellationToken: cancellationToken);

        return numChanged > 0;
    }

    public async Task<CreateFriendRequestStatus> CreateOrResolveRequestAsync(
        Guid senderId, 
        Guid receiverId, 
        DateTimeOffset utcNow, 
        CancellationToken cancellationToken = default
    ) {
        FriendRequest newRequest = new() {
            SenderUserId = senderId,
            ReceiverUserId = receiverId,
            Status = FriendRequestStatus.Pending,
            CreatedAt = utcNow,
        };

        dbContext.FriendRequests.Add(newRequest);

        try {
            await dbContext.SaveChangesAsync(cancellationToken);
            return CreateFriendRequestStatus.Success;
        } catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation }) {
            // conflict, automatically friend if the existing is from the "toUser".
            
            // TODO: Not doing raw SQL query once EF supports returning clause.
            var updatedId = await dbContext.Database.SqlQuery<Guid>(
                $"""
                 UPDATE "FriendRequests"
                 SET "Status" = {(int)FriendRequestStatus.Accepted}, "UpdatedAt" = {utcNow}
                 WHERE "SenderUserId" = {receiverId} AND "ReceiverUserId" = {senderId}
                 RETURNING "Id"
                 """).FirstOrDefaultAsync(cancellationToken);

            if (updatedId != Guid.Empty) {
                return CreateFriendRequestStatus.AutoAccept;
            }
            
            // likely caused by the user sent the exact same request twice at the same time
            return CreateFriendRequestStatus.AlreadyExist;
        }
    }

    public async Task<PaginatedResult<DiscoverFriendSummary>> GetPaginatedFriendDiscoveryAsync(
        Guid searcherId, 
        string? nameFilter,
        int offset,
        int count,
        CancellationToken cancellationToken = default
    ) {
        var queryable = dbContext.Users
            // ignore the user who requests the search and anyone who hasn't setup their profile
            .Where(u => u.Id != searcherId && u.IsProfileSetup)
            .NameContains(nameFilter);
        
        int totalCount = await queryable.CountAsync(cancellationToken);

        List<DiscoverFriendSummary> paginatedItems = await queryable
            .OrderBy(u => u.UserName)
            .Skip(offset)
            .Take(count)
            .Select(u => new DiscoverFriendSummary(
                u.Id,
                u.UserName!, 
                u.DisplayName!, 
                u.HasAvatar,
                dbContext.FriendRequests
                    .Where(fr => 
                        (fr.SenderUserId == searcherId && fr.ReceiverUserId == u.Id || fr.SenderUserId == u.Id && fr.ReceiverUserId == searcherId) &&
                        // only care about active states, ignore canceled and rejected
                        (fr.Status == FriendRequestStatus.Pending || fr.Status == FriendRequestStatus.Accepted)
                    )
                    .Select(fr => 
                        fr.Status == FriendRequestStatus.Accepted ? UserRelationshipStatus.Friended :
                        fr.SenderUserId == searcherId ? UserRelationshipStatus.OutcomingRequest : 
                        UserRelationshipStatus.IncomingRequest
                    )
                    .FirstOrDefault()
            ))
            .ToListAsync(cancellationToken);
        
        return new(paginatedItems, totalCount);
    }

    public async Task<PaginatedResult<FriendSummary>> GetPaginatedFriendsAsync(
        Guid searcherId, 
        string? nameFilter,
        int offset,
        int count,
        CancellationToken cancellationToken = default
    ) {
        var acceptedRequestsQuery = dbContext.FriendRequests
            .Where(r => r.SenderUserId == searcherId || r.ReceiverUserId == searcherId)
            .Where(r => r.Status == FriendRequestStatus.Accepted)
            .Select(r => r.SenderUserId == searcherId ? r.Receiver : r.Sender)
            .NameContains(nameFilter);

        int totalCount = await acceptedRequestsQuery.CountAsync(cancellationToken);
        var paginatedItems = await acceptedRequestsQuery
            .OrderBy(u => u.UserName)
            .Skip(offset)
            .Take(count)
            .Select(u => new FriendSummary(
                u.Id,
                u.UserName!,
                u.DisplayName!,
                u.HasAvatar
            ))
            .ToListAsync(cancellationToken);
        
        return new(paginatedItems, totalCount);
    }

    public async Task<PaginatedResult<PendingFriendRequestSummary>> GetPaginatedPendingRequestsAsync(
        Guid searcherId, 
        string? nameFilter,
        int offset,
        int count,
        CancellationToken cancellationToken = default
    ) {
        var pendingRequestsQuery = dbContext.FriendRequests
            .Where(r => r.SenderUserId == searcherId || r.ReceiverUserId == searcherId)
            .Where(r => r.Status == FriendRequestStatus.Pending)
            .Select(r => new {
                Other = r.SenderUserId == searcherId ? r.Receiver : r.Sender,
                Request = r,
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
        
        int totalCount = await pendingRequestsQuery.CountAsync(cancellationToken);
        
        var paginatedItems = await pendingRequestsQuery
            .OrderBy(t => t.Other.UserName)
            .Skip(offset)
            .Take(count)
            .Select(t => new PendingFriendRequestSummary(
                t.Other.Id,
                t.Other.UserName!,
                t.Other.DisplayName!,
                t.Other.HasAvatar,
                t.Request.SenderUserId == searcherId ? 
                    UserRelationshipStatus.OutcomingRequest : 
                    UserRelationshipStatus.IncomingRequest
            ))
            .ToListAsync(cancellationToken);

        return new(paginatedItems, totalCount);
    }
}