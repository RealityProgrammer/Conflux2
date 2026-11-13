using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;

namespace Conflux.Domain.Repositories;

public interface IFriendRequestRepository : IRepository<FriendRequest> {
    Task<FriendRequestSummary?> GetRequestSummary(Guid user1, Guid user2);

    Task<bool> TryTransitionStatus(
        Guid requestId, 
        FriendRequestStatus expectedStatus, 
        FriendRequestStatus newStatus, 
        DateTimeOffset utcTime, 
        CancellationToken cancellationToken = default
    );
}