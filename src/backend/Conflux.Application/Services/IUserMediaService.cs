using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IUserMediaService {
    Task<Result<MediaUploadResult>> UploadAvatar(Guid userId, Stream stream, CancellationToken cancellationToken = default);
    Task<Result> DeleteAvatar(Guid userId, CancellationToken cancellationToken = default);
    Task<Result> BackupAvatar(Guid userId, CancellationToken cancellationToken = default);
    Task<Result> RestoreAvatar(Guid userId, CancellationToken cancellationToken = default);
    Task<Result> DeleteAvatarBackup(Guid userId, CancellationToken cancellationToken = default);
    
    Task<Result<MediaUploadResult>> UploadBanner(Guid userId, Stream stream, CancellationToken cancellationToken = default);
    Task<Result> DeleteBanner(Guid userId, CancellationToken cancellationToken = default);
    Task<Result> BackupBanner(Guid userId, CancellationToken cancellationToken = default);
    Task<Result> RestoreBanner(Guid userId, CancellationToken cancellationToken = default);
    Task<Result> DeleteBannerBackup(Guid userId, CancellationToken cancellationToken = default);
    
    Task<AvatarMediaItemInfo?> GetAvatar(Guid userId, CancellationToken cancellationToken = default);
    Task<BannerMediaItemInfo?> GetBanner(Guid userId, CancellationToken cancellationToken = default);
    
    Task Purge(IReadOnlyList<Guid> userIds, CancellationToken cancellationToken = default);
}