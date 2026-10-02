using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IConversationParticipantRepository : IReadRepository<ConversationParticipant>, IWriteRepository<ConversationParticipant>;