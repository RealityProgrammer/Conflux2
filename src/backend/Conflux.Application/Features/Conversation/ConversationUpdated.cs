namespace Conflux.Application.Features.Conversation;

public sealed record ConversationUpdatedNotification(
    Guid ConversationId,
    IReadOnlyCollection<Guid> ParticipantUserIds
) : INotification;