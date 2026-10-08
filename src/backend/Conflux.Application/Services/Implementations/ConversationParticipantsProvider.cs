using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace Conflux.Application.Services.Implementations;

internal sealed class ConversationParticipantsProvider(
    IConnectionMultiplexer connectionMultiplexer,
    IConversationParticipantRepository conversationParticipantRepository
) : IConversationParticipantsProvider {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task<IReadOnlyCollection<Guid>> GetDirectConversationParticipantIds(Guid conversationId, CancellationToken cancellationToken = default) {
        string cacheKey = GetCacheKey(conversationId);
        
        RedisValue[] cachedMembers = await _database.SetMembersAsync(cacheKey);

        if (cachedMembers.Length > 0) {
            return [..cachedMembers.Select(value => Guid.Parse(value.ToString()))];
        }
        
        List<Guid> ids = await conversationParticipantRepository
            .AsQueryable()
            .Where(p => p.ConversationId == conversationId)
            .Select(p => p.UserId)
            .ToListAsync(cancellationToken);
        
        if (ids.Count > 0) {
            RedisValue[] redisValues = new RedisValue[ids.Count];
            for (int i = 0; i < redisValues.Length; i++) {
                redisValues[i] = (RedisValue)ids[i].ToString();
            }
            
            await _database.SetAddAsync(cacheKey, redisValues);
            await _database.KeyExpireAsync(cacheKey, TimeSpan.FromMinutes(10));
        }
        
        return ids;
    }

    public async Task ClearDirectConversationParticipantsCache(Guid conversationId) {
        await _database.KeyDeleteAsync(GetCacheKey(conversationId));
    }

    private static string GetCacheKey(Guid conversationId) {
        return $"conversation:{conversationId}:participants";
    }
}