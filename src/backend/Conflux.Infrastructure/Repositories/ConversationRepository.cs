using Conflux.Domain;
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
    
    public async Task<Result> UpdateLatestMessageTime(Guid conversationId, DateTimeOffset time) {
        int changed = await dbContext.Conversations
            .Where(c => c.Id == conversationId)
            .ExecuteUpdateAsync(setter => {
                setter.SetProperty(c => c.LatestMessageAt, time);
            });

        return changed == 1 ? Result.Success() : Errors.ResourceNotFound("Conversation");
    }
}