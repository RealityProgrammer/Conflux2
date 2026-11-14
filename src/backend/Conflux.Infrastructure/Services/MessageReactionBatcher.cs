using Conflux.Application.Enums;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using StackExchange.Redis;

namespace Conflux.Infrastructure.Services;

internal sealed class MessageReactionBatcher(
    IConnectionMultiplexer connectionMultiplexer,
    IMessageReactionRepository messageReactionRepository,
    IUnitOfWork unitOfWork
) : IMessageReactionBatcher {
    private const int MaxUniqueReactions = 25;
    
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task<Result> RecordDelta(
        Guid userId, 
        Guid messageId, 
        string reactionKey, 
        ReactionAction action,
        CancellationToken cancellationToken = default
    ) {
        string messageIdString = messageId.ToString();
        RedisKey reactionDeltaKey = GetDeltaKey(messageId);
        RedisValue field = $"{userId}:{reactionKey}";
        
        // if the action is Add, verify the unique reaction limit
        if (action == ReactionAction.Add) {
            // check if active reactions key exists, else load from database and fill in the cache
            RedisKey activeReactionsKey = GetActiveReactionsKey(messageId);

            if (!await _database.KeyExistsAsync(activeReactionsKey)) {
                await WarmUpActiveReactions(messageId, activeReactionsKey, cancellationToken);
            }
            
            // check for max unique reaction count, check if the reaction is "active", else append to the unique list.
            bool isAlreadyActive = await _database.SetContainsAsync(activeReactionsKey, reactionKey);

            if (!isAlreadyActive) {
                long uniqueCount = await _database.SetLengthAsync(activeReactionsKey);
                
                if (uniqueCount >= MaxUniqueReactions) {
                    return Result.Failure(Errors.MessageUniqueReactionLimit(MaxUniqueReactions));
                }
                
                await _database.SetAddAsync(activeReactionsKey, reactionKey);
                await _database.KeyExpireAsync(activeReactionsKey, TimeSpan.FromDays(7));
            }
        }
        
        // it is hard to implement same thing to remove where it check for emoji with 0 user, but it might have to
        // manually resolve delta and scan fields and stuffs so just leave it to the database sync method

        await _database.HashSetAsync(reactionDeltaKey, field, (int)action);
        await _database.SetAddAsync("message:reactions_dirty", messageIdString);

        return Result.Success();
    }

    private async Task WarmUpActiveReactions(Guid messageId, RedisKey activeReactionsKey, CancellationToken cancellationToken) {
        var reactionKeys = await messageReactionRepository
            .GetMessageReactionKeys(messageId, cancellationToken);

        if (reactionKeys is { Count: > 0 }) {
            await _database.SetAddAsync(activeReactionsKey, [..reactionKeys.Select(k => (RedisValue)k)]);
            await _database.KeyExpireAsync(activeReactionsKey, TimeSpan.FromDays(7));
        }
    }

    public async Task Synchronize(CancellationToken cancellationToken = default) {
        RedisValue[] dirtyMessageIds = await _database.SetMembersAsync("message:reactions_dirty");
        if (dirtyMessageIds.Length == 0) return;
        
        foreach (var messageIdValue in dirtyMessageIds) {
            if (!Guid.TryParse(messageIdValue.ToString(), out var messageId)) continue;
        
            RedisKey reactionDeltaKey = GetDeltaKey(messageId);
            
            // get all deltas
            HashEntry[] entries = await _database.HashGetAllAsync(reactionDeltaKey);
            if (entries.Length == 0) continue;
            
            MessageReaction? messageReaction = await messageReactionRepository
                .AsQueryable()
                .FirstOrDefaultAsync(r => r.MessageId == messageId, cancellationToken);
        
            if (messageReaction == null) {
                messageReaction = new() { MessageId = messageId, Reactions = [] };
                messageReactionRepository.Add(messageReaction);
            }

            var reactionSpanLookup = messageReaction.Reactions.GetAlternateLookup<ReadOnlySpan<char>>();
            
            // apply delta differences
            foreach (var entry in entries) {
                // entry is $"{userId}:{reactionKey}", extract the userId and reactionKey
                
                string fieldName = entry.Name!;
                int colonIndex = fieldName.IndexOf(':');

                if (colonIndex == -1) {
                    continue;
                }

                if (!Guid.TryParse(fieldName.AsSpan(0, colonIndex), out Guid userId)) {
                    continue;
                }

                ReactionAction action = (ReactionAction)(int)entry.Value;

                ReadOnlySpan<char> reactionKey = fieldName.AsSpan(colonIndex + 1);
                
                // ensure list exists for the reactionKey
                if (!reactionSpanLookup.TryGetValue(reactionKey, out var reaction)) {
                    reactionSpanLookup[reactionKey] = reaction = [];
                }

                switch (action) {
                    case ReactionAction.Add:
                        reaction.Add(userId);
                        break;
                    
                    case ReactionAction.Remove:
                        reaction.Remove(userId);
                        break;
                }
            }
            
            // cleanup empty reaction to prevent bloat
            List<RedisValue> keysToRemove = [];
            foreach (var key in messageReaction.Reactions.Keys.ToList()) {
                if (messageReaction.Reactions[key].Count == 0) {
                    messageReaction.Reactions.Remove(key);
                    keysToRemove.Add(key);
                }
            }

            if (keysToRemove.Count > 0) {
                await _database.SetRemoveAsync(GetActiveReactionsKey(messageId), [..keysToRemove]);
            }
            
            unitOfWork.MarkAsModified(messageReaction);
        }

        // save database
        int changes = await unitOfWork.SaveChangesAsync(cancellationToken);
        
        GC.KeepAlive(changes);
        
        // cleanup delta and dirty markers
        await _database.SetRemoveAsync("message:reactions_dirty", dirtyMessageIds);
        
        await _database.KeyDeleteAsync(
            [..dirtyMessageIds.Select(id => GetDeltaKey(Guid.Parse((string)id!))),
        ]);
    }

    private static RedisKey GetActiveReactionsKey(Guid messageId) => $"message:{{{messageId}}}:reaction:active";
    private static RedisKey GetDeltaKey(Guid messageId) => $"message:{{{messageId}}}:reaction:delta";
}