using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface IConversationAuthorizeStrategy {
    ConversationType ConversationType { get; }

    Task<bool> CanSendMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default);
}