using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IUserMediaService {
    Task<Result> UploadAvatar(Guid userId, Stream stream, CancellationToken cancellationToken = default);
    Task<Result> DeleteAvatar(Guid userId, CancellationToken cancellationToken = default);
    
    Task<Result> UploadBanner(Guid userId, Stream stream, CancellationToken cancellationToken = default);
    Task<Result> DeleteBanner(Guid userId, CancellationToken cancellationToken = default);
}