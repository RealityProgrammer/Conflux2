using Conflux.Application.Enums;
using Conflux.Application.Notifications;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Mediator;
using StackExchange.Redis;

namespace Conflux.Infrastructure.Services;

internal sealed class MessageReactionBatcher(
    IConnectionMultiplexer connectionMultiplexer,
    IMessageRepository messageRepository,
    IMessageReactionRepository messageReactionRepository,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<MessageReactionBatcher> logger
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
        var messageType = await messageRepository
            .AsQueryable()
            .Where(m => m.Id == messageId)
            .Select(m => m.Type)
            .Cast<MessageType?>()
            .FirstOrDefaultAsync(cancellationToken);

        if (messageType == null) {
            return Errors.ResourceNotFound("Message", [
                new(nameof(Message.Id), messageId.ToString()),
            ]);
        }

        if (messageType.Value != MessageType.Message) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(messageId)] = [
                    "Message of this type cannot be reacted.",
                ],
            });
        }
        
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

                var batch = _database.CreateBatch();
                var addActiveTask = batch.SetAddAsync(activeReactionsKey, reactionKey);
                var expireTask = batch.KeyExpireAsync(activeReactionsKey, TimeSpan.FromDays(7));
                
                batch.Execute();
                
                await Task.WhenAll(addActiveTask, expireTask);
            }
        }

        // it is hard to implement same thing to remove where it checks for emoji with 0 user, but it might have to
        // manually resolve delta and scan fields and stuffs so just leave it to the database sync method

        // check if there is an existing delta
        RedisValue existingDelta = await _database.HashGetAsync(reactionDeltaKey, field);

        if (existingDelta.HasValue) {
            ReactionAction previousAction = (ReactionAction)(int)existingDelta;

            // since there is only 2 actions, so if user do any action different from the existing delta, remove it
            if (previousAction != action) {
                await _database.HashDeleteAsync(reactionDeltaKey, field);
                return Result.Success();
            }
        }
        
        string messageIdString = messageId.ToString();

        var finalBatch = _database.CreateBatch();
        var setHashTask = finalBatch.HashSetAsync(reactionDeltaKey, field, (int)action);
        var setDirtyTask = finalBatch.SetAddAsync("message:reactions_dirty", messageIdString);
        finalBatch.Execute();
        
        await Task.WhenAll(setHashTask, setDirtyTask);
        
        return Result.Success();
    }

    private async Task WarmUpActiveReactions(Guid messageId, RedisKey activeReactionsKey, CancellationToken cancellationToken) {
        var reactionKeys = await messageReactionRepository
            .GetMessageReactionKeys(messageId, cancellationToken);

        if (reactionKeys is { Count: > 0 }) {
            var batch = _database.CreateBatch();
            
            var setAddTask = batch.SetAddAsync(activeReactionsKey, [
                ..reactionKeys.Select(k => {
                    return k.SourceType switch {
                        ReactionIconSourceType.Emoji => (RedisValue)$"emoji.{k.EmojiId}",
                        ReactionIconSourceType.Unicode => (RedisValue)$"unicode.{k.UnicodeValue}",
                        _ => RedisValue.EmptyString     // why
                    };
                }),
            ]);
            var keyExpireTask = batch.KeyExpireAsync(activeReactionsKey, TimeSpan.FromDays(7));
            
            batch.Execute();
            
            await Task.WhenAll(setAddTask, keyExpireTask);
        }
    }

    public async Task Synchronize(CancellationToken cancellationToken = default) {
        RedisValue[] dirtyMessageIdValues = await _database.SetMembersAsync("message:reactions_dirty");
        if (dirtyMessageIdValues.Length == 0) return;

        List<Guid> dirtyMessageIds = [..dirtyMessageIdValues.Select(v => Guid.Parse((string)v!))];
        
        var redisBatch = _database.CreateBatch();
        List<Task> redisCleanupTasks = [];
        List<string> processedMessageIdsKeys = [];

        List<Guid> successfullySyncedMessageIds = [];
        Dictionary<Guid, List<UserReactionActionDto>> messageUserActions = new(dirtyMessageIds.Count);
        Dictionary<Guid, MessageReactionCountSummaryData> summaries;
        
        var reactionDeltas = new Dictionary<(ReactionIconSourceType IconSource, string Key), (HashSet<Guid> Adds, HashSet<Guid> Removes)>();
        
        await unitOfWork.BeginTransactionAsync(cancellationToken);

        try {
            foreach (var messageId in dirtyMessageIds) {
                RedisKey deltaKey = GetDeltaKey(messageId);
                
                HashEntry[] entries = await _database.HashGetAllAsync(deltaKey);
                if (entries.Length == 0) {
                    processedMessageIdsKeys.Add(messageId.ToString());
                    continue;
                }
                
                reactionDeltas.Clear();
                var actionsForThisMessage = new List<UserReactionActionDto>();
                
                foreach (var entry in entries) {
                    string field = entry.Name!; // format: "{userId}:{reactionKey}" (reactionKey is "unicode.{value} or "emoji.{value}"
                    int colonIndex = field.IndexOf(':');
                    if (colonIndex == -1) continue;

                    Guid userId = Guid.Parse(field.AsSpan(0, colonIndex));
                    ReadOnlySpan<char> remainder = field.AsSpan(colonIndex + 1);

                    int dotIndex = remainder.IndexOf('.');
                    if (dotIndex == -1) continue;

                    ReactionIconSourceType iconSource;

                    switch (remainder[..dotIndex]) {
                        case "unicode":
                            iconSource = ReactionIconSourceType.Unicode;
                            break;

                        case "emoji":
                            iconSource = ReactionIconSourceType.Emoji;
                            break;

                        default:
                            continue;
                    }
                    
                    string reactionKey = remainder[(dotIndex + 1)..].ToString();
                    ReactionAction action = (ReactionAction)(int)entry.Value;
                    
                    actionsForThisMessage.Add(new(userId, remainder.ToString(), action));

                    var mapKey = (iconSource, reactionKey);
                    if (!reactionDeltas.TryGetValue(mapKey, out var deltaBucket)) {
                        deltaBucket = ([], []);
                        reactionDeltas[mapKey] = deltaBucket;
                    }

                    // resolve opposite actions within the same sync window
                    if (action == ReactionAction.Add) {
                        deltaBucket.Adds.Add(userId);
                        deltaBucket.Removes.Remove(userId);
                    } else {
                        deltaBucket.Removes.Add(userId);
                        deltaBucket.Adds.Remove(userId);
                    }
                }

                foreach (var kvp in reactionDeltas) {
                    (ReactionIconSourceType iconSource, string reactionKey) = kvp.Key;
                    (HashSet<Guid> adds, HashSet<Guid> removes) = kvp.Value;
                
                    switch (iconSource) {
                        case ReactionIconSourceType.Unicode:
                            await messageReactionRepository.UpdateUnicodeReaction(messageId, reactionKey, adds, removes, cancellationToken);
                            break;
                        
                        case ReactionIconSourceType.Emoji:
                            Guid emojiId = Guid.Parse(reactionKey);
                            await messageReactionRepository.UpdateEmojiReaction(messageId, emojiId, adds, removes, cancellationToken);
                            break;
                        
                        default: continue;
                    }
                }
                
                messageUserActions[messageId] = actionsForThisMessage;
                redisCleanupTasks.Add(redisBatch.KeyDeleteAsync(deltaKey));
                processedMessageIdsKeys.Add(messageId.ToString());
                successfullySyncedMessageIds.Add(messageId);
            }
            
            if (processedMessageIdsKeys.Count > 0) {
                redisCleanupTasks.Add(redisBatch.SetRemoveAsync("message:reactions_dirty", processedMessageIdsKeys.Select(id => (RedisValue)id).ToArray()));
            }

            await unitOfWork.SaveChangesAsync(cancellationToken);
            
            // write, read and commit
            if (successfullySyncedMessageIds.Count > 0) {
                summaries = await messageReactionRepository.GetReactionSummariesAsync(successfullySyncedMessageIds, cancellationToken);
            } else {
                summaries = [];
            }
            
            await unitOfWork.CommitAsync(cancellationToken);
            
            redisBatch.Execute();
            await Task.WhenAll(redisCleanupTasks);
        } catch (OperationCanceledException) {
            await unitOfWork.RollbackAsync(CancellationToken.None);
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while synchronizing message reactions.");
            return;
        }
        
        var syncedMessagesDict = successfullySyncedMessageIds
            .Where(summaries.ContainsKey)
            .Select(id => {
                var s = summaries[id];
                
                return new {
                    s.ConversationId,
                    MessageItem = new MessageItemReactionDto(
                        s.MessageId,
                        s.ReactionsCounts
                    )
                };
            })
            .GroupBy(x => x.ConversationId)
            .ToDictionary(
                g => g.Key,
                g => new MessageReactionSyncDto(g.Select(x => x.MessageItem).ToList())
            );
        
        var userActionsPerUser = messageUserActions
            .Values
            .SelectMany(actions => actions)
            .GroupBy(action => action.UserId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var notification = new MessageReactionsSynchronizedNotification(
            syncedMessagesDict,
            userActionsPerUser
        );

        await publisher.Publish(notification, cancellationToken);
    }

    private static RedisKey GetActiveReactionsKey(Guid messageId) => $"message:{{{messageId}}}:reaction:active";
    private static RedisKey GetDeltaKey(Guid messageId) => $"message:{{{messageId}}}:reaction:delta";
}
