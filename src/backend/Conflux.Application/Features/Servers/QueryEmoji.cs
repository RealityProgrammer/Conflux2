using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record QueryEmoji(Guid ServerId) : IQuery<List<EmojiListItemDto>>;

public sealed class QueryEmojiHandler(
    IEmojiReadRepository emojiReadRepository,
    IServerEmojiCacheProvider cacheProvider
) : IQueryHandler<QueryEmoji, List<EmojiListItemDto>> {
    public async ValueTask<List<EmojiListItemDto>> Handle(QueryEmoji query, CancellationToken cancellationToken) {
        var serverId = query.ServerId;

        if (await cacheProvider.Get(serverId) is { } cached) {
            return cached;
        }
        
        List<EmojiListItemDto> emojis = await emojiReadRepository
            .AsQueryable()
            .Where(e => e.ServerId == query.ServerId)
            .Select(e => new EmojiListItemDto(e.Id, e.ShortCode))
            .ToListAsync(cancellationToken);

        await cacheProvider.Set(serverId, emojis);
        return emojis;
    }
}