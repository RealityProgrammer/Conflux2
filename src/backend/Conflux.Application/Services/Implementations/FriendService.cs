namespace Conflux.Application.Services.Implementations;

internal sealed class FriendService : IFriendService {
    public async Task<Result> SendFriendRequestAsync(Guid fromUser, Guid toUser) {
        await Task.CompletedTask;

        return Result.Success();
    }
}