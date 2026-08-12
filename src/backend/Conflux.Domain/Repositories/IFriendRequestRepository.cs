using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;

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
    
    Task<PaginatedResult<DiscoverFriendSummary>> GetFriendDiscoveryAsync(
        Guid searcherId, 
        string? nameFilter, 
        int offset,
        int count,
        CancellationToken cancellationToken = default
    );

    Task<PaginatedResult<UserIdentityProfileDto>> GetFriendsAsync(
        Guid searcherId,
        string? nameFilter,
        int offset,
        int count,
        CancellationToken cancellationToken = default
    );

    Task<PaginatedResult<PendingFriendRequestDto>> GetPendingRequestsAsync(
        Guid searcherId,
        string? nameFilter,
        int offset,
        int count,
        CancellationToken cancellationToken = default
    );
}