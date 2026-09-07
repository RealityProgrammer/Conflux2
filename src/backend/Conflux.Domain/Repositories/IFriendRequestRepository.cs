using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;

namespace Conflux.Domain.Repositories;

public interface IFriendRequestRepository : IWriteRepository<FriendRequest> {
    Task<FriendRequestSummary?> GetRequestSummary(Guid user1, Guid user2);

    Task<Guid?> TryAcceptReverseRequest(Guid senderId, Guid receiverId, DateTimeOffset utcNow, CancellationToken cancellationToken = default);
    
    Task<bool> ReactivateRequestAsPending(
        Guid requestId, 
        Guid senderUserId, 
        Guid receiverUserId, 
        DateTimeOffset utcTime,
        CancellationToken cancellationToken = default
    );

    Task<bool> TryTransitionStatus(
        Guid requestId, 
        FriendRequestStatus expectedStatus, 
        FriendRequestStatus newStatus, 
        DateTimeOffset utcTime, 
        CancellationToken cancellationToken = default
    );
    
    Task<PaginatedResult<DiscoverFriendSummary>> GetFriendDiscovery(
        Guid searcherId, 
        string? nameFilter, 
        int offset,
        int count,
        CancellationToken cancellationToken = default
    );

    Task<PaginatedResult<UserIdentityProfileDto>> GetFriends(
        Guid searcherId,
        string? nameFilter,
        int offset,
        int count,
        CancellationToken cancellationToken = default
    );

    Task<PaginatedResult<PendingFriendRequestDto>> GetPendingRequests(
        Guid searcherId,
        string? nameFilter,
        int offset,
        int count,
        CancellationToken cancellationToken = default
    );
}