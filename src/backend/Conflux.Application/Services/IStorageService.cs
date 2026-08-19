using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IStorageService {
    Task<Result<string>> UploadUserAvatar(
        Guid userId,
        UploadItem avatar,
        CancellationToken cancellationToken = default
    );

    Task<Result> DeleteUserAvatar(Guid userId, CancellationToken cancellationToken = default);

    string GetUserAvatarPreSignedUrl(Guid userId);

    Task<Result<Guid>> UploadMessageAttachment(
        UploadItem attachment, 
        CancellationToken cancellationToken = default
    );

    Task<Result> DeleteMessageAttachment(Guid attachmentId, CancellationToken cancellationToken = default);
    
    string GetMessageAttachmentPreSignedUrl(Guid attachmentId);

    Task<Result<string>> UploadCommunityServerAvatar(
        Guid communityServerId,
        UploadItem avatar,
        CancellationToken cancellationToken = default
    );

    string GetCommunityServerAvatarPreSignedUrl(Guid serverId);
}