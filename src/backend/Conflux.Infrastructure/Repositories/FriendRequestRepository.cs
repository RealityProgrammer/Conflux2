using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Extensions;
using Conflux.Domain.Repositories;
using Facet.Extensions;

namespace Conflux.Infrastructure.Repositories;

internal sealed class FriendRequestRepository(
    ApplicationDbContext dbContext
) : IFriendRequestRepository {
    public IQueryable<FriendRequest> AsQueryable() {
        return dbContext.FriendRequests;
    }
    
    public async Task<FriendRequestSummary?> GetRequestSummary(Guid user1, Guid user2) {
        return await dbContext.FriendRequests
            .Where(r =>
                r.SenderUserId == user1 && r.ReceiverUserId == user2 ||
                r.SenderUserId == user2 && r.ReceiverUserId == user1
            )
            .SelectFacet<FriendRequestSummary>()
            .FirstOrDefaultAsync();
    }

    public void Add(FriendRequest friendRequest) {
        dbContext.FriendRequests.Add(friendRequest);
    }

    public async Task<bool> TryTransitionStatus(
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
}