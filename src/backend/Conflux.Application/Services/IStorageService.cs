using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IStorageService {
    Task<Result<string>> UploadUserAvatarAsync(
        Guid userId,
        Stream stream, 
        string contentType, 
        CancellationToken cancellationToken = default
    );

    Task<Result> DeleteUserAvatarAsync(Guid userId, CancellationToken cancellationToken = default);

    Result<string> GetUserAvatarUrl(Guid userId, bool useHttps);
}