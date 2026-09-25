using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IServerMediaService {
    Task<Result> UploadAvatar(Guid serverId, Stream stream, CancellationToken cancellationToken = default);
    Task<Result> DeleteAvatar(Guid serverId, CancellationToken cancellationToken = default);
    
    Task<Result> UploadBanner(Guid serverId, Stream stream, CancellationToken cancellationToken = default);
    Task<Result> DeleteBanner(Guid serverId, CancellationToken cancellationToken = default);
    
    Task<string> GetAvatarPreSignedUrl(Guid userId, CancellationToken cancellationToken = default);
    Task<string> GetBannerPreSignedUrl(Guid userId, CancellationToken cancellationToken = default);
}