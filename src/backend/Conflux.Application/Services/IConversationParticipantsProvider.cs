namespace Conflux.Application.Services;

public interface IConversationParticipantsProvider {
    Task<IReadOnlyCollection<Guid>> GetDirectConversationParticipantIds(
        Guid conversationId, 
        CancellationToken cancellationToken = default
    );

    Task ClearDirectConversationParticipantsCache(Guid conversationId);
}