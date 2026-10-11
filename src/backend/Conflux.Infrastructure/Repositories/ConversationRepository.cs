using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class ConversationRepository(
    ApplicationDbContext dbContext
) : IConversationRepository {
    public void Add(Conversation conversation) {
        dbContext.Conversations.Add(conversation);
    }
    
    public IQueryable<Conversation> AsQueryable() {
        return dbContext.Conversations;
    }
}