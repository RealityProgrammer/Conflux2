using Conflux.Application.Dto.Requests;
using Conflux.Application.Dto.Responses;

namespace Conflux.Application.Services;

public interface IUserService {
    Task<Result<AvatarUploadResponse>> UploadAvatarAsync(Guid userId, Stream avatarStream, string contentType);
    Task<Result<OpenAvatarResponse>> OpenAvatarAsync(Guid userId);
    Task<Result> DeleteAvatarAsync(Guid userId);

    string GetAvatarUrl(Guid userId, bool useHttps);

    Task<Result> SetupProfileAsync(SetupProfileRequest request);
    Task<Result<UserBasicProfileResponse>> GetUserBasicProfileAsync(Guid userId);
}