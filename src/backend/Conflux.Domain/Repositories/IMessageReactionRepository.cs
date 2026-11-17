using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IMessageReactionRepository : IRepository<MessageReaction> {
    Task<List<ReactionIconSource>> GetMessageReactionKeys(
        Guid messageId,
        CancellationToken cancellationToken = default
    );

    Task UpdateUnicodeReaction(
        Guid messageId,
        string unicodeValue,
        IReadOnlyCollection<Guid> addUserIds,
        IReadOnlyCollection<Guid> removeUserIds,
        CancellationToken cancellationToken = default
    );

    Task UpdateEmojiReaction(
        Guid messageId,
        Guid emojiId,
        IReadOnlyCollection<Guid> addUserIds,
        IReadOnlyCollection<Guid> removeUserIds,
        CancellationToken cancellationToken = default
    );

    Task<Dictionary<Guid, MessageReactionCountSummaryData>> GetReactionSummariesAsync(
        IReadOnlyCollection<Guid> messageIds,
        CancellationToken cancellationToken = default
    );
}
