using Conflux.Domain;
using Conflux.Domain.Entities;

namespace Conflux.Application.Services;

public interface IDirectConversationProvider {
    Task<Result<Conversation>> GetOrCreate(Guid user1Id, Guid user2Id, CancellationToken cancellationToken);
}