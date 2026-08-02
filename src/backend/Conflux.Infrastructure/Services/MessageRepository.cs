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
        
        // if no cursor message is provided, mean load latest messages, ignore the direction parameter
        if (cursorMessageId is not { } cursorId) {
            var latestMessages = await baseQuery
                .OrderByDescending(m => m.Id)   // uuidv7 btw
                .Select(m => new MessageDto(m.Id, m.SenderUserId, m.Body, m.AttachmentIds, m.CreatedAt))
                .Take(limit)
                .Reverse()  // return the messages in chronological order
                .ToListAsync(cancellationToken);

            return Result<GetMessagesResult>.Success(new(
                latestMessages, 
                latestMessages.Count == limit, 
                false
            ));
        }

        switch (direction) {
            case MessageLoadDirection.Before:
            {
                var messages = await baseQuery
                    .Where(m => m.Id.CompareTo(cursorId) < 0)
                    .OrderByDescending(m => m.Id)
                    .Select(m => new MessageDto(m.Id, m.SenderUserId, m.Body, m.AttachmentIds, m.CreatedAt))
                    .Take(limit)
                    .Reverse()
                    .ToListAsync(cancellationToken);
                
                return Result<GetMessagesResult>.Success(new(
                    messages, 
                    messages.Count == limit, 
                    null
                ));
            }

            case MessageLoadDirection.After:
            {
                var messages = await baseQuery
                    .Where(m => m.Id.CompareTo(cursorId) > 0)
                    .OrderBy(m => m.Id)
                    .Select(m => new MessageDto(m.Id, m.SenderUserId, m.Body, m.AttachmentIds, m.CreatedAt))
                    .Take(limit)
                    .ToListAsync(cancellationToken);
                
                return Result<GetMessagesResult>.Success(new(
                    messages, 
                    null,
                    messages.Count == limit
                ));
            }

            case MessageLoadDirection.Around:
            {
                int halfLimit = limit / 2;

                var before = await baseQuery
                    .Where(m => m.Id.CompareTo(cursorId) < 0)
                    .OrderByDescending(m => m.Id)
                    .Select(m => new MessageDto(m.Id, m.SenderUserId, m.Body, m.AttachmentIds, m.CreatedAt))
                    .Take(halfLimit)
                    .Reverse()
                    .ToListAsync(cancellationToken);

                var after = await baseQuery
                    .Where(m => m.Id.CompareTo(cursorId) >= 0) // can't forget the cursor message too lmao
                    .OrderBy(m => m.Id)
                    .Select(m => new MessageDto(m.Id, m.SenderUserId, m.Body, m.AttachmentIds, m.CreatedAt))
                    .Take(halfLimit + 1)
                    .ToListAsync(cancellationToken);

                return Result<GetMessagesResult>.Success(new(
                    [..before, ..after], // TODO: Not doing this
                    before.Count == halfLimit,
                    after.Count == halfLimit + 1
                ));
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
}