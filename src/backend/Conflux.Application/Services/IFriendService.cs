using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Services;

public interface IFriendService {
    Task<Result<SendFriendRequestResponse>> SendFriendRequest(Guid fromUserId, Guid toUserId);
    Task<Result> CancelFriendRequest(Guid senderUserId, Guid toUserId);
    Task<Result> RejectFriendRequest(Guid receiverUserId, Guid senderUserId);
    Task<Result> AcceptFriendRequest(Guid receiverUserId, Guid senderUserId);
    Task<Result> Unfriend(Guid invokerUserId, Guid otherUserId);
    
    Task<Result<PaginatedResult<DiscoverFriendSummary>>> DiscoverFriends(
        Guid searchingUserId,
        string? nameFilter, 
        int offset, 
        int count
    );

    Task<Result<PaginatedResult<UserIdentityProfileDto>>> QueryFriends(
        Guid searchingUserId,
        string? nameFilter,
        int offset,
        int count
    );
    
    Task<Result<PaginatedResult<PendingFriendRequestDto>>> QueryPendingRequests(
        Guid searchingUserId,
        string? nameFilter,
        int offset,
        int count
    );
}