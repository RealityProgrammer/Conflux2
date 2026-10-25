using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record QueryEmojiEntries(Guid ServerId) : IQuery<List<EmojiListItemDto>>;

public sealed class QueryEmojiEntriesHandler(
    IEmojiReadRepository emojiReadRepository,
    IServerEmojiCacheProvider cacheProvider
) : IQueryHandler<QueryEmojiEntries, List<EmojiListItemDto>> {
    public async ValueTask<List<EmojiListItemDto>> Handle(QueryEmojiEntries query, CancellationToken cancellationToken) {
        var serverId = query.ServerId;

        if (await cacheProvider.Get(serverId) is { } cached) {
            return cached;
        }
        
        List<EmojiListItemDto> emojis = await emojiReadRepository
            .AsQueryable()
            .Where(e => e.ServerId == query.ServerId)
            .OrderBy(e => e.ShortCode)
            .Select(e => new EmojiListItemDto(e.Id, e.ShortCode))
            .ToListAsync(cancellationToken);

        await cacheProvider.Set(serverId, emojis);
        return emojis;
    }
}