using Conflux.Application.Dto.Responses;

namespace Conflux.Application.Services;

public interface IFriendService {
    Task<Result<SendFriendRequestResponse>> SendFriendRequestAsync(Guid fromUserId, Guid toUserId);
    Task<Result> CancelFriendRequestAsync(Guid senderUserId, Guid friendRequestId);
    Task<Result> RejectFriendRequestAsync(Guid receiverUserId, Guid friendRequestId);
    Task<Result> AcceptFriendRequestAsync(Guid receiverUserId, Guid friendRequestId);
}