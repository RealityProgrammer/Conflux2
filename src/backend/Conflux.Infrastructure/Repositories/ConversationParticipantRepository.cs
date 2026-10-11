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

    public async Task<bool> IsUserJoinedConversation(
        Guid userId, 
        Guid conversationId,
        CancellationToken cancellationToken = default
    ) {
        return await dbContext
            .ConversationParticipants
            .AnyAsync(c => c.UserId == userId && c.ConversationId == conversationId, cancellationToken);
    }
}