namespace Conflux.Application.Services;

public interface IBlobUrlProvider {
    string GetUserAvatarPreSignedUrl(Guid userId);
    string GetMessageAttachmentPreSignedUrl(Guid attachmentId);
    string GetCommunityServerAvatarPreSignedUrl(Guid serverId);
}