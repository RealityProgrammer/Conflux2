using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Services;

public interface IUserService {
    Task<Result> UploadAvatar(Guid userId, Stream avatarStream);
    Task<Result> DeleteAvatar(Guid userId);
    string GetAvatarUrl(Guid userId);

    Task<Result> SetupProfile(SetupProfileRequest request);
    Task<Result<UserIdentityProfileDto>> GetIdentityProfile(Guid userId);
}