using Conflux.Application.Dto.Requests;
using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Interfaces;

public interface IUserService {
    Task<Result> UploadAvatarAsync(Guid userId, Stream avatarStream, string contentType);
    Task<Result> DeleteAvatarAsync(Guid userId);
    string GetAvatarUrl(Guid userId, bool useHttps);

    Task<Result> SetupProfileAsync(SetupProfileRequest request);
    Task<Result<UserBasicProfileSummary>> GetUserBasicProfileAsync(Guid userId);
}