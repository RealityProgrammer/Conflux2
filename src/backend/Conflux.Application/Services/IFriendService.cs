using Conflux.Application.Dto.Responses;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IFriendService {
    Task<Result<SendFriendRequestResponse>> SendFriendRequestAsync(Guid fromUserId, Guid toUserId);
    Task<Result> CancelFriendRequestAsync(Guid senderUserId, Guid toUserId);
    Task<Result> RejectFriendRequestAsync(Guid receiverUserId, Guid senderUserId);
    Task<Result> AcceptFriendRequestAsync(Guid receiverUserId, Guid senderUserId);
    Task<Result> UnfriendAsync(Guid invokerUserId, Guid otherUserId);
    
    Task<Result<PaginatedResponse<DiscoverFriendElement>>> DiscoverFriendsAsync(
        Guid searchingUserId,
        string? nameFilter, 
        int offset, 
        int count
    );

    Task<Result<PaginatedResponse<QueryFriendElement>>> QueryFriendsAsync(
        Guid searchingUserId,
        string? nameFilter,
        int offset,
        int count
    );
    
    Task<Result<PaginatedResponse<QueryPendingRequestElement>>> QueryPendingRequestsAsync(
        Guid searchingUserId,
        string? nameFilter,
        int offset,
        int count
    );
}