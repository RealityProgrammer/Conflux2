using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record QueryEmojiEntries(Guid ServerId) : IQuery<List<EmojiEntryDto>>;

public sealed class QueryEmojiEntriesHandler(
    IEmojiRepository emojiRepository,
    IServerEmojiCacheService cacheService
) : IQueryHandler<QueryEmojiEntries, List<EmojiEntryDto>> {
    public async ValueTask<List<EmojiEntryDto>> Handle(QueryEmojiEntries query, CancellationToken cancellationToken) {
        var serverId = query.ServerId;

        if (await cacheService.Get(serverId) is { } cached) {
            return cached;
        }

        List<EmojiEntryDto> emojis = await emojiRepository.GetEntriesByServerId(serverId, cancellationToken);

        await cacheService.Set(serverId, emojis);
        return emojis;
    }
}