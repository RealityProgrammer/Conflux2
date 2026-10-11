using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IConversationRepository : IReadRepository<Conversation>, IWriteRepository<Conversation>;