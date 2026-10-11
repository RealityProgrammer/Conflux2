namespace Conflux.Application.Features.Conversation;

public sealed record DirectConversationUpdatedNotification(
    Guid ConversationId,
    IReadOnlyCollection<Guid> ParticipantUserIds
) : INotification;