using Conflux.Application.Dto.Responses;

namespace Conflux.Application.Services;

public interface IFriendService {
    Task<Result<SendFriendRequestResponse>> SendFriendRequestAsync(Guid fromUser, Guid toUser);
}