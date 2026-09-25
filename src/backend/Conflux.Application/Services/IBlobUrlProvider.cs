using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IBlobUrlProvider {
    Task<string> GetUserAvatarPreSignedUrl(Guid userId);
    Task<string> GetUserBannerPreSignedUrl(Guid userId);
    Task<string> GetServerAvatarPreSignedUrl(Guid serverId);
    Task<string> GetServerBannerPreSignedUrl(Guid serverId);
    Task<Result<string>> GetMessageAttachmentPreSignedUrl(Guid attachmentId, bool download);
}