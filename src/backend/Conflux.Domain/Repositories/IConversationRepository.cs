using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IConversationRepository : IReadRepository<Conversation>, IWriteRepository<Conversation> {
    Task<Result> UpdateLatestMessageTime(Guid conversationId, DateTimeOffset time);
}