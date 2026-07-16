using Conflux.Application.Responses;

namespace Conflux.Application.Services.Implementations;

internal sealed class UserService : IUserService {
    public Task<Result<AvatarUploadResponse>> UploadAvatarAsync(string userId, Stream avatarStream) {
        throw new NotImplementedException();
    }
}