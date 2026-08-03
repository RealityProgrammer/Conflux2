using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Services;

internal sealed class MessageRepository(
    ApplicationDbContext dbContext
) : IMessageRepository {
    public void Add(Message message) {
        dbContext.Messages.Add(message);
    }

    public async Task<Result<GetMessagesResult>> GetMessagesAsync(
        Guid conversationId, 
        MessageLoadDirection? direction, 
        Guid? cursorMessageId, 
        int limit,
        CancellationToken cancellationToken = default
    ) {
        var baseQuery = dbContext.Messages
            .Where(m => m.ConversationId == conversationId);

        List<MessageDto> messages;
        bool? hasMoreBefore, hasMoreAfter;
        
        // if no cursor message is provided, mean load latest messages, ignore the direction parameter
        if (cursorMessageId is not { } cursorId) {
            messages = await baseQuery
                .OrderByDescending(m => m.Id)   // uuidv7 btw
                .Select(m => new MessageDto(m.Id, m.SenderUserId, m.Body, m.Attachments, m.CreatedAt))
                .Take(limit)
                .Reverse()  // return the messages in chronological order
                .ToListAsync(cancellationToken);

            hasMoreBefore = messages.Count == limit;
            hasMoreAfter = false;
        } else {
            switch (direction) {
                case MessageLoadDirection.Before: {
                    messages = await baseQuery
                        .Where(m => m.Id.CompareTo(cursorId) < 0)
                        .OrderByDescending(m => m.Id)
                        .Select(m => new MessageDto(m.Id, m.SenderUserId, m.Body, m.Attachments, m.CreatedAt))
                        .Take(limit)
                        .Reverse()
                        .ToListAsync(cancellationToken);

                    hasMoreBefore = messages.Count == limit;
                    hasMoreAfter = null;
                    break;
                }

                case MessageLoadDirection.After: {
                    messages = await baseQuery
                        .Where(m => m.Id.CompareTo(cursorId) > 0)
                        .OrderBy(m => m.Id)
                        .Select(m => new MessageDto(m.Id, m.SenderUserId, m.Body, m.Attachments, m.CreatedAt))
                        .Take(limit)
                        .ToListAsync(cancellationToken);

                    hasMoreBefore = null;
                    hasMoreAfter = messages.Count == limit;
                    break;
                }

                case MessageLoadDirection.Around: {
                    int halfLimit = limit / 2;

                    var before = await baseQuery
                        .Where(m => m.Id.CompareTo(cursorId) < 0)
                        .OrderByDescending(m => m.Id)
                        .Select(m => new MessageDto(m.Id, m.SenderUserId, m.Body, m.Attachments, m.CreatedAt))
                        .Take(halfLimit)
                        .Reverse()
                        .ToListAsync(cancellationToken);

                    var after = await baseQuery
                        .Where(m => m.Id.CompareTo(cursorId) >= 0) // can't forget the cursor message too lmao
                        .OrderBy(m => m.Id)
                        .Select(m => new MessageDto(m.Id, m.SenderUserId, m.Body, m.Attachments, m.CreatedAt))
                        .Take(halfLimit + 1)
                        .ToListAsync(cancellationToken);

                    messages = [..before, ..after];
                    hasMoreBefore = before.Count == halfLimit;
                    hasMoreAfter = after.Count == halfLimit + 1;
                    break;
                }
                
                case null:
                    return Errors.ValidationErrorsOccured(new() {
                        [nameof(direction)] = [
                            "Value must be specified when cursor isn't null.",
                        ],
                    });
                
                default:
                    return Errors.ValidationErrorsOccured(new() {
                        [nameof(direction)] = [
                            "Unexpected enumeration value.",
                        ],
                    });
            }
        }

        Dictionary<Guid, UserBasicProfileSummary> users;

        if (messages.Count == 0) {
            users = [];
        } else {
            var uniqueUserIds = messages
                .Select(m => m.SenderUserId)
                .Distinct()
                .ToList();
            
            users = await dbContext.Users
                .Where(u => uniqueUserIds.Contains(u.Id))
                .Select(u => new UserBasicProfileSummary(u.Id, u.UserName, u.DisplayName, u.HasAvatar))
                .ToDictionaryAsync(u => u.Id, cancellationToken);
        }

        return Result<GetMessagesResult>.Success(new(messages, users, hasMoreBefore, hasMoreAfter));
    }
}