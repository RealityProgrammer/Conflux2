using Conflux.Application.Dto.Requests;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IStorageService {
    Task<Result<string>> UploadUserAvatarAsync(
        Guid userId,
        UploadItem avatar,
        CancellationToken cancellationToken = default
    );

    Task<Result> DeleteUserAvatarAsync(Guid userId, CancellationToken cancellationToken = default);

    Result<string> GetUserAvatarUrl(Guid userId, bool useHttps);

    Task<Result<List<Guid>>> UploadMessageAttachmentsAsync(
        IEnumerable<UploadItem> attachments, 
        CancellationToken cancellationToken = default
    );

    Task<Result> DeleteMessageAttachmentAsync(Guid attachmentId, CancellationToken cancellationToken = default);
}