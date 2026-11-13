using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

internal sealed class ServerEmojiProvider(
    IServerEmojiCacheService serverEmojiCacheService,
    IEmojiRepository emojiRepository
) : IServerEmojiProvider {
    public async Task<Dictionary<Guid, IReadOnlyCollection<EmojiEntryDto>>> GetEntries(
        IReadOnlyCollection<Guid> serverIds, 
        CancellationToken cancellationToken
    ) {
        Dictionary<Guid, IReadOnlyCollection<EmojiEntryDto>> resultGroups = new();
        
        // collect from cache first
        List<Guid> missServerIds = [];
        
        foreach (var serverId in serverIds) {
            if (await serverEmojiCacheService.Get(serverId) is { } cached) {
                if (cached.Count > 0) {
                    resultGroups.Add(serverId, cached);
                }
            } else {
                missServerIds.Add(serverId);
            }
        }
        
        if (missServerIds.Count == 0) {
            return resultGroups;
        }
        
        // collect cache-miss and backfill
        var groups = await emojiRepository
            .AsQueryable()
            .Where(e => missServerIds.Contains(e.ServerId))
            .OrderBy(e => e.ServerId)
            .ThenBy(e => e.ShortCode)
            .Select(e => new {
                e.ServerId,
                EmojiDto = new EmojiEntryDto(e.Id, e.ShortCode)
            })
            .GroupBy(e => e.ServerId)
            .ToDictionaryAsync(
                g => g.Key,
                g => g.Select(x => x.EmojiDto).ToList(),
                cancellationToken
            );

        foreach ((Guid serverId, var entries) in groups) {
            resultGroups.Add(serverId, entries);
            await serverEmojiCacheService.Set(serverId, entries);
        }
        
        return resultGroups;
    }
}