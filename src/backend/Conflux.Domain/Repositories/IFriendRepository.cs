using Conflux.Domain.Dto;

namespace Conflux.Domain.Repositories;

public interface IFriendRepository {
    Task<FriendRequestSummary?> GetRequestSummaryAsync(Guid user1, Guid user2);
    
    Task<CreateFriendRequestStatus> CreateOrResolveRequestAsync(
        Guid senderId,
        Guid receiverId,
        DateTimeOffset utcNow,
        CancellationToken cancellationToken = default
    );
    
    Task<bool> ReactivateRequestAsPendingAsync(
        Guid requestId, 
        Guid senderUserId, 
        Guid receiverUserId, 
        DateTimeOffset utcTime,
        CancellationToken cancellationToken = default
    );
    
    Task<bool> AcceptRequestAsync(Guid requestId, DateTimeOffset utcTime, CancellationToken cancellationToken = default);
    Task<bool> CancelRequestAsync(Guid requestId, DateTimeOffset utcTime, CancellationToken cancellationToken = default);
    Task<bool> RejectRequestAsync(Guid requestId, DateTimeOffset utcTime, CancellationToken cancellationToken = default);
    Task<bool> UnfriendAsync(Guid requestId, DateTimeOffset utcTime, CancellationToken cancellationToken = default);
    
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