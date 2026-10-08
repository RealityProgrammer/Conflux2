namespace Conflux.Application.Services;

public interface IConversationAuthorizeService {
    Task<bool> CanReadMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default);
    Task<bool> CanSendMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default);
    Task<bool> CanEditMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default);
    Task<bool> CanDeleteMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default);
}