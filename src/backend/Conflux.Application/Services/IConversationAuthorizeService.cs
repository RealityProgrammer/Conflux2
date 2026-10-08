namespace Conflux.Application.Services;

public interface IConversationAuthorizeService {
    Task<bool> CanSendMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default);
}