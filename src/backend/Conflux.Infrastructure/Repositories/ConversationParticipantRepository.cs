using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class ConversationParticipantRepository(
    ApplicationDbContext dbContext
) : IConversationParticipantRepository {
    public IQueryable<ConversationParticipant> AsQueryable() {
        return dbContext.ConversationParticipants;
    }
    
    public void Add(ConversationParticipant value) {
        dbContext.ConversationParticipants.Add(value);
    }
}