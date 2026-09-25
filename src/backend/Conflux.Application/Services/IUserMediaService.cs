using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IUserMediaService {
    Task<Result> UploadAvatar(Guid userId, Stream stream, CancellationToken cancellationToken = default);
    Task<Result> DeleteAvatar(Guid userId, CancellationToken cancellationToken = default);
    Task<Result<bool>> BackupAvatar(Guid userId, int backupRevision, CancellationToken cancellationToken = default);
    Task<Result> RestoreAvatar(Guid userId, int backupRevision, bool wasBackedUp, CancellationToken cancellationToken = default);
    Task<Result> DeleteAvatarBackup(Guid userId, int backupRevision, CancellationToken cancellationToken = default);
    
    Task<Result> UploadBanner(Guid userId, Stream stream, CancellationToken cancellationToken = default);
    Task<Result> DeleteBanner(Guid userId, CancellationToken cancellationToken = default);
    Task<Result<bool>> BackupBanner(Guid userId, int backupRevision, CancellationToken cancellationToken = default);
    Task<Result> RestoreBanner(Guid userId, int backupRevision, bool wasBackedUp, CancellationToken cancellationToken = default);
    Task<Result> DeleteBannerBackup(Guid userId, int backupRevision, CancellationToken cancellationToken = default);
    
    Task<string> GetAvatarPreSignedUrl(Guid userId, CancellationToken cancellationToken = default);
    Task<string> GetBannerPreSignedUrl(Guid userId, CancellationToken cancellationToken = default);
}