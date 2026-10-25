using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using HotChocolate.Authorization;

namespace Conflux.WebApi.GraphQL.Queries;

[QueryType, Authorize]
public static partial class EmojiQuery {
    [UseSingleOrDefault, UseProjection]
    public static IQueryable<Emoji> GetEmoji(
        Guid id,
        [Service] ApplicationDbContext dbContext
    ) {
        return dbContext.Emojis.Where(r => r.Id == id);
    }
}