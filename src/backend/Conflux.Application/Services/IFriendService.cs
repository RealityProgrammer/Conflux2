using Conflux.Application.Dto.Responses;

namespace Conflux.Application.Services;

public interface IFriendService {
    Task<Result<SendFriendRequestResponse>> SendFriendRequestAsync(Guid fromUser, Guid toUser);
    Task<Result> CancelFriendRequestAsync(Guid senderUserId, Guid friendRequestId);
    Task<Result> RejectFriendRequestAsync(Guid receiverUserId, Guid friendRequestId);
}