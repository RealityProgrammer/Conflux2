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
    private static readonly int CacheTtl = (int)TimeSpan.FromMinutes(10).TotalSeconds;
    
    private readonly Dictionary<ConversationType, IConversationAuthorizeStrategy> _strategies = 
        strategies.ToDictionary(x => x.ConversationType);

    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();


    private readonly LuaScript _getOperationAuthorizeInfoScript = LuaScript.Prepare(
        """
        local allow = redis.call("HGET", @UserAuthorizationKey, @Operation)
        if allow then
            redis.call("EXPIRE", @UserAuthorizationKey, @Ttl)
            return allow
        end
        
        return nil
        """
    );

    private readonly LuaScript _setOperationAuthorizeInfoScript = LuaScript.Prepare(
        """
        redis.call("HSET", @UserAuthorizationKey, @Operation, @Value)
        redis.call("EXPIRE", @UserAuthorizationKey, @Ttl)
        """
    );
    
    public async Task<bool> CanReadMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        string key = GetConversationParticipantAuthorizationCacheKey(conversationId, userId);

        RedisResult value = await _database.ScriptEvaluateAsync(
            _getOperationAuthorizeInfoScript, 
            new GetOperationAuthorizeInfoParameters(key, "read", CacheTtl)
        );

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

        bool allow = await strategy.CanReadMessage(userId, conversationId, cancellationToken);

        await _database.ScriptEvaluateAsync(
            _setOperationAuthorizeInfoScript, 
            new SetOperationAuthorizeInfoParameters(key, "read", allow, CacheTtl)
        );
        
        return allow;
    }
    
    public async Task<bool> CanSendMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        string key = GetConversationParticipantAuthorizationCacheKey(conversationId, userId);

        RedisResult value = await _database.ScriptEvaluateAsync(
            _getOperationAuthorizeInfoScript, 
            new GetOperationAuthorizeInfoParameters(key, "send", CacheTtl)
        );

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

        bool allow = await strategy.CanSendMessage(userId, conversationId, cancellationToken);

        await _database.ScriptEvaluateAsync(
            _setOperationAuthorizeInfoScript, 
            new SetOperationAuthorizeInfoParameters(key, "send", allow, CacheTtl)
        );
        
        return allow;
    }

    public async Task<bool> CanEditMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        string key = GetConversationParticipantAuthorizationCacheKey(conversationId, userId);

        RedisResult value = await _database.ScriptEvaluateAsync(
            _getOperationAuthorizeInfoScript, 
            new GetOperationAuthorizeInfoParameters(key, "edit", CacheTtl)
        );
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

        bool allow = await strategy.CanEditMessage(userId, conversationId, cancellationToken);

        await _database.ScriptEvaluateAsync(
            _setOperationAuthorizeInfoScript, 
            new SetOperationAuthorizeInfoParameters(key, "edit", allow, CacheTtl)
        );
        
        return allow;
    }
    
    public async Task<bool> CanDeleteMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        string key = GetConversationParticipantAuthorizationCacheKey(conversationId, userId);

        RedisResult value = await _database.ScriptEvaluateAsync(
            _getOperationAuthorizeInfoScript, 
            new GetOperationAuthorizeInfoParameters(key, "delete", CacheTtl)
        );

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

        bool allow = await strategy.CanDeleteMessage(userId, conversationId, cancellationToken);

        await _database.ScriptEvaluateAsync(
            _setOperationAuthorizeInfoScript, 
            new SetOperationAuthorizeInfoParameters(key, "delete", allow, CacheTtl)
        );
        
        return allow;
    }

    private static string GetConversationParticipantAuthorizationCacheKey(Guid conversationId, Guid userId) {
        return $"conversation:{conversationId}:authorize:{userId}";
    }

    private sealed record GetOperationAuthorizeInfoParameters(string UserAuthorizationKey, string Operation, int Ttl);
    private sealed record SetOperationAuthorizeInfoParameters(string UserAuthorizationKey, string Operation, bool Value, int Ttl);
}