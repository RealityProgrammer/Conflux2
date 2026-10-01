namespace Conflux.Application.Services;

public interface IConversationAuthorizeService {
    Task<bool> CanSendMessage(Guid userId, Guid channelId, CancellationToken cancellationToken = default);
}