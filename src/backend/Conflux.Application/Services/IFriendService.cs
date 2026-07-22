namespace Conflux.Application.Services;

public interface IFriendService {
    Task<Result> SendFriendRequestAsync(Guid fromUser, Guid toUser);
}