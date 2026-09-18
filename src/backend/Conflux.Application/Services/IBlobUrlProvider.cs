using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IBlobUrlProvider {
    string GetUserAvatarPreSignedUrl(Guid userId);
    Task<Result<string>> GetMessageAttachmentPreSignedUrl(Guid attachmentId, bool download);
    string GetCommunityServerAvatarPreSignedUrl(Guid serverId);
}