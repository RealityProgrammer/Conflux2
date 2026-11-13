using Conflux.Application.Enums;

namespace Conflux.Application.Services;

public interface IMessageReactionBatcher {
    Task RecordDelta(
        Guid userId, 
        Guid messageId, 
        string reactionKey, 
        ReactionAction action
    );
    
    Task Synchronize(CancellationToken cancellationToken = default);
}