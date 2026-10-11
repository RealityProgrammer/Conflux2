using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
// ReSharper disable VariableHidesOuterVariable

namespace Conflux.Application.Services.Implementations;

internal sealed class ConversationAuthorizeService(
    IEnumerable<IConversationAuthorizeStrategy> strategies,
    IConversationRepository conversationRepository,
    IConversationMetadataProvider conversationMetadataProvider,
    IServerRoleVersioningService serverRoleVersioningService,
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
        return await AuthorizeAsync(
            userId, 
            conversationId, 
            "read", 
            (strategy, userId, conversationId, cancellationToken) => 
                strategy.CanReadMessage(userId, conversationId, cancellationToken), 
            cancellationToken
        );
    }
    
    public async Task<bool> CanSendMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        return await AuthorizeAsync(
            userId, 
            conversationId, 
            "send", 
            (strategy, userId, conversationId, cancellationToken) => 
                strategy.CanSendMessage(userId, conversationId, cancellationToken), 
            cancellationToken
        );
    }

    public async Task<bool> CanEditMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        return await AuthorizeAsync(
            userId, 
            conversationId, 
            "edit", 
            (strategy, userId, conversationId, cancellationToken) => 
                strategy.CanEditMessage(userId, conversationId, cancellationToken), 
            cancellationToken
        );
    }
    
    public async Task<bool> CanDeleteMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        return await AuthorizeAsync(
            userId, 
            conversationId, 
            "edit", 
            (strategy, userId, conversationId, cancellationToken) => 
                strategy.CanDeleteMessage(userId, conversationId, cancellationToken), 
            cancellationToken
        );
    }

    private async Task<bool> AuthorizeAsync(
        Guid userId,
        Guid conversationId,
        string operation,
        Func<IConversationAuthorizeStrategy, Guid, Guid, CancellationToken, Task<bool>> strategyCall,
        CancellationToken cancellationToken
    ) {
        if (await conversationMetadataProvider.Get(conversationId, cancellationToken) is not { } conversationMetadata) {
            return false;
        }

        string key;
        if (conversationMetadata.Type == ConversationType.Server) {
            key = await GetServerConversationAuthorizeKey(conversationMetadata.ServerId!.Value, conversationId, userId);
        } else {
            key = GetDirectConversationAuthorizeKey(conversationId, userId);
        }

        RedisResult value = await _database.ScriptEvaluateAsync(
            _getOperationAuthorizeInfoScript, 
            new GetOperationAuthorizeInfoParameters(key, "read", CacheTtl)
        );
        
        if (!value.IsNull) {
            return (bool)value;
        }
        
        // cache miss
        if (!_strategies.TryGetValue(conversationMetadata.Type, out var strategy)) return false;

        bool allow = await strategyCall(strategy, userId, conversationId, cancellationToken);
        
        await _database.ScriptEvaluateAsync(
            _setOperationAuthorizeInfoScript, 
            new SetOperationAuthorizeInfoParameters(key, "read", allow, CacheTtl)
        );
        
        return allow;
    }
    
    private static string GetDirectConversationAuthorizeKey(Guid conversationId, Guid userId) {
        return $"direct_conversation:{conversationId}:authorize:{userId}";
    }

    private async Task<string> GetServerConversationAuthorizeKey(Guid serverId, Guid conversationId, Guid userId) {
        int version = await serverRoleVersioningService.Get(serverId);
        return $"server:{serverId}:conversation:{conversationId}:authorize:{userId}:v{version}";
    }

    private sealed record GetOperationAuthorizeInfoParameters(string UserAuthorizationKey, string Operation, int Ttl);
    private sealed record SetOperationAuthorizeInfoParameters(string UserAuthorizationKey, string Operation, bool Value, int Ttl);
}