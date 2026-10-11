using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface IConversationAuthorizeStrategy {
    ConversationType ConversationType { get; }

    Task<bool> CanReadMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default);
    Task<bool> CanSendMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default);
    Task<bool> CanEditMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default);
    Task<bool> CanDeleteMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default);
}