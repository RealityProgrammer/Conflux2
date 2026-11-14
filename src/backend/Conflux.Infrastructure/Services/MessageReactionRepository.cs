using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Services;

internal sealed class MessageReactionRepository(
    ApplicationDbContext dbContext
) : IMessageReactionRepository {
    public IQueryable<MessageReaction> AsQueryable() {
        return dbContext.MessageReactions;
    }

    public void Add(MessageReaction value) {
        dbContext.MessageReactions.Add(value);
    }

    public async Task<List<string>> GetMessageReactionKeys(Guid messageId, CancellationToken cancellationToken = default) {
        return await dbContext.Database.SqlQuery<string>(
            $"""
            SELECT jsonb_object_keys("Reactions") FROM "MessageReactions" WHERE "MessageId" = '{messageId}';
            """
        ).ToListAsync(cancellationToken);
    }
}