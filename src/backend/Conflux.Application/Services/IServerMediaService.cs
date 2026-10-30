using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IServerMediaService {
    Task<Result<MediaUploadResult>> UploadAvatar(Guid serverId, Stream stream, CancellationToken cancellationToken = default);
    Task<Result> DeleteAvatar(Guid serverId, CancellationToken cancellationToken = default);
    
    Task<Result> UploadBanner(Guid serverId, Stream stream, CancellationToken cancellationToken = default);
    Task<Result> DeleteBanner(Guid serverId, CancellationToken cancellationToken = default);

    string GetAvatarPreSignedUrl(Guid serverId, TimeSpan expireIn);
    string GetBannerPreSignedUrl(Guid serverId, TimeSpan expireIn);
}