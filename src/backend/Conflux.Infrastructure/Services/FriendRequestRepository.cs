using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Extensions;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Services;

internal sealed class FriendRequestRepository(
    ApplicationDbContext dbContext
) : IFriendRequestRepository {
    public async Task<FriendRequestSummary?> GetRequestSummaryAsync(Guid user1, Guid user2) {
        return await dbContext.FriendRequests
            .Where(r =>
                r.SenderUserId == user1 && r.ReceiverUserId == user2 ||
                r.SenderUserId == user2 && r.ReceiverUserId == user1
            )
            .Select(r => new FriendRequestSummary(r.Id, r.Status, r.SenderUserId))
            .FirstOrDefaultAsync();
    }

    public void Add(FriendRequest friendRequest) {
        dbContext.FriendRequests.Add(friendRequest);
    }

    public async Task<Guid?> TryAcceptReverseRequestAsync(Guid senderId, Guid receiverId, DateTimeOffset utcNow, CancellationToken cancellationToken = default) {
        var updatedId = await dbContext.Database.SqlQuery<Guid>(
            $"""
             UPDATE "FriendRequests"
             SET "Status" = {(int)FriendRequestStatus.Accepted}, "UpdatedAt" = {utcNow}
             WHERE "SenderUserId" = {receiverId} AND "ReceiverUserId" = {senderId} AND "Status" = {(int)FriendRequestStatus.Pending}
             RETURNING "Id"
             """).FirstOrDefaultAsync(cancellationToken);

        return updatedId == Guid.Empty ? null : updatedId;
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

    public async Task<bool> TryTransitionStatusAsync(
        Guid requestId,
        FriendRequestStatus expectedStatus,
        FriendRequestStatus newStatus,
        DateTimeOffset utcTime,
        CancellationToken cancellationToken = default
    ) {
        int numChanged = await dbContext.FriendRequests
            .Where(r => r.Id == requestId && r.Status == expectedStatus)
            .ExecuteUpdateAsync(setter => setter
                    .SetProperty(r => r.Status, newStatus)
                    .SetProperty(r => r.UpdatedAt, utcTime), 
                cancellationToken);

        return numChanged > 0;
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