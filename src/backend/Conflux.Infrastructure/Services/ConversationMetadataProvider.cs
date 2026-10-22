using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using StackExchange.Redis;

namespace Conflux.Infrastructure.Services;

internal sealed class ConversationMetadataProvider(
    IConversationRepository conversationRepository,
    IConnectionMultiplexer connectionMultiplexer
) : IConversationMetadataProvider {
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(1);

    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    private readonly LuaScript _getMetadataScript = LuaScript.Prepare(
        """
        local type = redis.call("HGET", @conversationMetadataKey, "type")
        local serverId = redis.call("HGET", @conversationMetadataKey, "serverId")
        
        return { type, serverId }
        """
    );

    private readonly LuaScript _setMetadataScript = LuaScript.Prepare(
        """
        redis.call("HSET", @conversationMetadataKey, "type", @conversationType)
        
        if @serverId ~= "" then
            redis.call("HSET", @conversationMetadataKey, "serverId", @serverId)
        end
        
        redis.call("EXPIRE", @conversationMetadataKey, @ttl);
        """
    );
    
    public async Task<ConversationMetadata?> Get(Guid conversationId, CancellationToken cancellationToken = default) {
        string key = $"conversation:{conversationId}";
        
        RedisResult result = await _database.ScriptEvaluateAsync(_getMetadataScript, new {
            conversationMetadataKey = key,
        });
        
        var resultValues = (RedisResult[])result!;

        if (!resultValues[0].IsNull) {
            ConversationType conversationType = (ConversationType)(int)resultValues[0];

            switch (conversationType) {
                case ConversationType.Direct:
                    return new(ConversationType.Direct, null);
                
                case ConversationType.Server:
                    if (resultValues[1].IsNull || !Guid.TryParse((string)resultValues[1]!, out var serverId)) {
                        break;
                    }

                    return new(ConversationType.Server, serverId);
            }
        }
        
        var metadata = await conversationRepository
            .AsQueryable()
            .Where(c => c.Id == conversationId)
            .Select(c => new {
                c.Type,
                ServerId = c.Channel == null ? (Guid?)null : c.Channel.CommunityServerId,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (metadata == null) {
            return null;
        }

        await _database.ScriptEvaluateAsync(_setMetadataScript, new {
            conversationMetadataKey = key,
            conversationType = (int)metadata.Type,
            serverId = metadata.ServerId?.ToString() ?? string.Empty,
            ttl = (int)CacheTtl.TotalSeconds,
        });

        return new(metadata.Type, metadata.ServerId);
    }
}