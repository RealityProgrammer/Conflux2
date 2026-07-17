using Conflux.Application.Responses;

namespace Conflux.Application.Services;

public interface IUserService {
    Task<Result<AvatarUploadResponse>> UploadAvatarAsync(Guid userId, Stream avatarStream, string contentType);
    Task<Result<OpenAvatarResponse>> OpenAvatarAsync(Guid userId);

    Result<string> GetAvatarUrl(Guid userId, bool useHttps);
}