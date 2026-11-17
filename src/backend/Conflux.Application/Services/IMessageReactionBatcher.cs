using Conflux.Application.Enums;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IMessageReactionBatcher {
    Task<Result> RecordDelta(
        Guid userId,
        Guid messageId,
        string reactionKey,
        ReactionAction action,
        CancellationToken cancellationToken = default
    );

    Task Synchronize(CancellationToken cancellationToken = default);
}
