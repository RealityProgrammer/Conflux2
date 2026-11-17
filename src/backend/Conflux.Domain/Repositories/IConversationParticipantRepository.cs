using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IConversationParticipantRepository : IRepository<ConversationParticipant> {
    Task<bool> IsUserJoinedConversation(Guid userId, Guid conversationId, CancellationToken cancellationToken = default);
}