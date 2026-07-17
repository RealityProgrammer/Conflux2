using Conflux.Application.Responses;

namespace Conflux.Application.Services;

public interface IUserService {
    Task<Result<AvatarUploadResponse>> UploadAvatarAsync(string userId, Stream avatarStream, string contentType);
}