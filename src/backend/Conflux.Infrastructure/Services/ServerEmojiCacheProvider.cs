using Conflux.Application.Dto;
using Conflux.Application.Services;
using MemoryPack;
using StackExchange.Redis;

namespace Conflux.Infrastructure.Services;

internal sealed class ServerEmojiCacheProvider(
    IConnectionMultiplexer connectionMultiplexer,
    ILogger<ServerEmojiCacheProvider> logger
) : IServerEmojiCacheProvider {
    private static readonly TimeSpan Ttl = TimeSpan.FromHours(3);
    
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task<List<EmojiListItemDto>?> Get(Guid serverId) {
        var cached = await _database.HashFieldGetAndSetExpiryAsync(
            GetStorageKey(serverId), 
            "emojis",
            Ttl
        );

        if (cached.IsNullOrEmpty) return null;

        try {
            return MemoryPackSerializer.Deserialize<List<EmojiListItemDto>>(cached);
        } catch (Exception e) {
            logger.LogError(e, "Failed to deserialize emojis for server {id}", serverId);
            return null;
        }
    }

    public async Task Remove(Guid serverId) {
        await _database.HashDeleteAsync(GetStorageKey(serverId), "emojis");
    }

    public async Task Set(Guid serverId, List<EmojiListItemDto> emojis) {
        await _database.HashFieldSetAndSetExpiryAsync(
            GetStorageKey(serverId), 
            "emojis", 
            MemoryPackSerializer.Serialize(emojis),
            Ttl
        );
    }

    private static string GetStorageKey(Guid serverId) => $"server:{serverId}";
}