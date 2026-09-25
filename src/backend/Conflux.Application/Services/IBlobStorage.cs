using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IBlobStorage {
    Task<Result<string>> UploadUserAvatar(
        Guid userId,
        UploadItem avatar,
        CancellationToken cancellationToken = default
    );

    Task<Result> DeleteUserAvatar(Guid userId, CancellationToken cancellationToken = default);
    
    Task<Result<string>> UploadUserBanner(
        Guid userId,
        UploadItem banner,
        CancellationToken cancellationToken = default
    );

    Task<Result> DeleteUserBanner(Guid userId, CancellationToken cancellationToken = default);

    Task<Result<string>> UploadServerAvatar(
        Guid serverId,
        UploadItem avatar,
        CancellationToken cancellationToken = default
    );
    
    Task<Result<string>> UploadServerBanner(
        Guid serverId,
        UploadItem avatar,
        CancellationToken cancellationToken = default
    );

    Task<Result> DeleteServerAvatar(Guid serverId, CancellationToken cancellationToken = default);
    
    Task<Result> DeleteServerBanner(Guid serverId, CancellationToken cancellationToken = default);
    
    Task<Result<Guid>> UploadMessageAttachment(
        UploadItem attachment, 
        CancellationToken cancellationToken = default
    );
    
    Task<Result> DeleteMessageAttachment(Guid attachmentId, CancellationToken cancellationToken = default);
}