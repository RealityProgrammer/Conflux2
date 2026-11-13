using Conflux.Application.Enums;
using Conflux.Application.Services;
using Conflux.Domain.Entities;
using StackExchange.Redis;

namespace Conflux.Infrastructure.Services;

internal sealed class MessageReactionBatcher(
    IConnectionMultiplexer connectionMultiplexer
) : IMessageReactionBatcher {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task RecordDelta(
        Guid userId, 
        Guid messageId, 
        string reactionKey, 
        ReactionAction action
    ) {
        string messageIdString = messageId.ToString();
        RedisKey reactionDeltaKey = $"message:{{{messageIdString}}}:reactions_delta";
        RedisValue field = $"{userId}:{reactionKey}";

        await _database.HashSetAsync(reactionDeltaKey, field, (int)action);
        await _database.SetAddAsync("message:reactions_dirty", messageIdString);
    }

    public async Task Synchronize(CancellationToken cancellationToken = default) {
        RedisValue[] dirtyMessageIds = await _database.SetMembersAsync("message:reactions_dirty");
        if (dirtyMessageIds.Length == 0) return;

        foreach (var messageIdValue in dirtyMessageIds) {
            if (!Guid.TryParse(messageIdValue.ToString(), out var messageId)) continue;

            RedisKey reactionDeltaKey = $"message:{{{messageId}}}:reactions_delta";
            
            // get all deltas
            HashEntry[] entries = await _database.HashGetAllAsync(reactionDeltaKey);
            if (entries.Length == 0) continue;
            
            var messageReaction = await dbContext.MessageReactions
                .FindAsync([messageId], cancellationToken);

            if (messageReaction == null)
            {
                messageReaction = new MessageReaction { MessageId = messageId, Data = [] };
                dbContext.MessageReactions.Add(messageReaction);
            }
        }
    }
}