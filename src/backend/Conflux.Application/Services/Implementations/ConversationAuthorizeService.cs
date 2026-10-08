using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace Conflux.Application.Services.Implementations;

internal sealed class ConversationAuthorizeService(
    IEnumerable<IConversationAuthorizeStrategy> strategies,
    IConversationRepository conversationRepository,
    IConnectionMultiplexer connectionMultiplexer
) : IConversationAuthorizeService {
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(10);
    
    private readonly Dictionary<ConversationType, IConversationAuthorizeStrategy> _strategies = 
        strategies.ToDictionary(x => x.ConversationType);

    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();


    private readonly LuaScript _getSendAuthorizationScript = LuaScript.Prepare(
        """
        local allow = redis.call("HGET", @userAuthorizationKey, "send")
        if allow then
            redis.call("EXPIRE", @userAuthorizationKey, @ttl)
            return allow
        end
        
        return nil
        """
    );

    private readonly LuaScript _setSendAuthorizationScript = LuaScript.Prepare(
        """
        redis.call("HSET", @userAuthorizationKey, "send", @value)
        redis.call("EXPIRE", @userAuthorizationKey, @ttl)
        """
    );
    
    public async Task<bool> CanSendMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        string key = GetConversationParticipantAuthorizationCacheKey(conversationId, userId);

        RedisResult value = await _database.ScriptEvaluateAsync(_getSendAuthorizationScript, new {
            userAuthorizationKey = key,
            ttl = CacheTtl.Seconds,
        });

        if (!value.IsNull) {
            return (bool)value;
        }
        
        // cache miss
        ConversationType? conversationType = await conversationRepository.AsQueryable()
            .Where(c => c.Id == conversationId)
            .Select(c => c.Type)
            .Cast<ConversationType?>()
            .FirstOrDefaultAsync(cancellationToken);

        if (conversationType == null) return false;
        if (!_strategies.TryGetValue(conversationType.Value, out var strategy)) return false;

        bool canSendMessage = await strategy.CanSendMessage(userId, conversationId, cancellationToken);

        await _database.ScriptEvaluateAsync(_setSendAuthorizationScript, new {
            userAuthorizationKey = key,
            value = canSendMessage,
            ttl = CacheTtl.Seconds,
        });
        
        return canSendMessage;
    }

    private static string GetConversationParticipantAuthorizationCacheKey(Guid conversationId, Guid userId) {
        return $"conversation:{conversationId}:auth:{userId}";
    }
}