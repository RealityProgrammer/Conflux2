using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IMessageReactionRepository : IRepository<MessageReaction> {
    Task<List<string>> GetMessageReactionKeys(Guid messageId, CancellationToken cancellationToken = default);
}