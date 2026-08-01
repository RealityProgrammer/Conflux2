using Conflux.Domain.Dto;

namespace Conflux.Domain.Repositories;

public interface IFriendRequestRepository {
    void Add(FriendRequest friendRequest);
    
    Task<FriendRequestSummary?> GetRequestSummaryAsync(Guid user1, Guid user2);

    Task<Guid?> TryAcceptReverseRequestAsync(Guid senderId, Guid receiverId, DateTimeOffset utcNow, CancellationToken cancellationToken = default);
    
    Task<bool> ReactivateRequestAsPendingAsync(
        Guid requestId, 
        Guid senderUserId, 
        Guid receiverUserId, 
        DateTimeOffset utcTime,
        CancellationToken cancellationToken = default
    );

    Task<bool> TryTransitionStatusAsync(
        Guid requestId, 
        FriendRequestStatus expectedStatus, 
        FriendRequestStatus newStatus, 
        DateTimeOffset utcTime, 
        CancellationToken cancellationToken = default
    );
    
    Task<PaginatedResult<DiscoverFriendSummary>> GetPaginatedFriendDiscoveryAsync(
        Guid searcherId, 
        string? nameFilter, 
        int offset,
        int count,
        CancellationToken cancellationToken = default
    );

    Task<PaginatedResult<FriendSummary>> GetPaginatedFriendsAsync(
        Guid searcherId,
        string? nameFilter,
        int offset,
        int count,
        CancellationToken cancellationToken = default
    );

    Task<PaginatedResult<PendingFriendRequestSummary>> GetPaginatedPendingRequestsAsync(
        Guid searcherId,
        string? nameFilter,
        int offset,
        int count,
        CancellationToken cancellationToken = default
    );
}