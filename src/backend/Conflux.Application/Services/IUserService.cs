using Conflux.Application.Dto.Requests;
using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Services;

public interface IUserService {
    Task<Result> UploadAvatarAsync(Guid userId, Stream avatarStream);
    Task<Result> DeleteAvatarAsync(Guid userId);
    string GetAvatarUrl(Guid userId, bool useHttps);

    Task<Result> SetupProfileAsync(SetupProfileRequest request);
    Task<Result<UserBasicProfileDto>> GetUserBasicProfileAsync(Guid userId);
}