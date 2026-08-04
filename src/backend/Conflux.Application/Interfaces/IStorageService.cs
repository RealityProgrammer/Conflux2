using Conflux.Application.Dto.Requests;
using Conflux.Domain;

namespace Conflux.Application.Interfaces;

public interface IStorageService {
    Task<Result<string>> UploadUserAvatarAsync(
        Guid userId,
        UploadItem avatar,
        CancellationToken cancellationToken = default
    );

    Task<Result> DeleteUserAvatarAsync(Guid userId, CancellationToken cancellationToken = default);

    string GetUserAvatarPreSignedUrl(Guid userId, bool useHttps);

    Task<Result<Guid>> UploadMessageAttachmentAsync(
        UploadItem attachment, 
        CancellationToken cancellationToken = default
    );

    Task<Result> DeleteMessageAttachmentAsync(Guid attachmentId, CancellationToken cancellationToken = default);
    
    string GetMessageAttachmentPreSignedUrl(Guid attachmentId, bool useHttps);
}