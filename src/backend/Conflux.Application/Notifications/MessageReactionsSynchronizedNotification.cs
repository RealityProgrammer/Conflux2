using Conflux.Application.Enums;

namespace Conflux.Application.Notifications;

public sealed record UserReactionActionDto(
    Guid UserId,
    string ReactionKey,
    ReactionAction Action
);

public sealed record MessageItemReactionDto(
    Guid MessageId,
    Dictionary<string, int> ReactionsCounts
);

public sealed record MessageReactionSyncDto(
    IReadOnlyCollection<MessageItemReactionDto> Messages
);

public sealed record MessageReactionsSynchronizedNotification(
    IReadOnlyDictionary<Guid, MessageReactionSyncDto> SyncedMessages,
    Dictionary<Guid, List<UserReactionActionDto>> UserActionsPerUser
) : INotification;