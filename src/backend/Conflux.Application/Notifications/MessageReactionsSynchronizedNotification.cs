using Conflux.Application.Enums;

namespace Conflux.Application.Notifications;

public sealed record UserReactionActionDto(
    Guid MessageId,
    Dictionary<string, ReactionAction> ReactionActions
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
