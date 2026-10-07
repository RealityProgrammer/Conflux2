using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Facet.Extensions;

namespace Conflux.Infrastructure.Repositories;

internal sealed class MessageRepository(
    ApplicationDbContext dbContext
) : IMessageRepository {
    public IQueryable<Message> AsQueryable() {
        return dbContext.Messages;
    }

    public void Add(Message message) {
        dbContext.Messages.Add(message);
    }

    public async Task<Result<TimelineMessagePage>> GetTimelineMessages(
        Guid conversationId, 
        MessageReadStrategy readStrategy,
        int limit,
        CancellationToken cancellationToken = default
    ) {
        List<TimelineMessageDto> messages;
        bool? hasMoreBefore, hasMoreAfter;
        
        var baseQuery = dbContext.Messages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .Include(m => m.ReplyTo);

        switch (readStrategy) {
            case MessageReadStrategy.Latest:
                messages = await baseQuery
                    .OrderByDescending(m => m.Id)
                    .SelectFacet<TimelineMessageDto>()
                    .Take(limit)
                    .Reverse()  // return the messages in chronological order
                    .ToListAsync(cancellationToken);
                
                hasMoreBefore = messages.Count == limit;
                hasMoreAfter = false;
                break;
            
            case MessageReadStrategy.Before before:
                messages = await baseQuery
                    .Where(m => m.Id.CompareTo(before.CursorId) < 0)
                    .OrderByDescending(m => m.Id)
                    .SelectFacet<TimelineMessageDto>()
                    .Take(limit)
                    .Reverse()
                    .ToListAsync(cancellationToken);
                
                hasMoreBefore = messages.Count == limit;
                hasMoreAfter = null;
                break;
            
            case MessageReadStrategy.After after:
                messages = await baseQuery
                    .Where(m => m.Id.CompareTo(after.CursorId) > 0)
                    .OrderBy(m => m.Id)
                    .SelectFacet<TimelineMessageDto>()
                    .Take(limit)
                    .ToListAsync(cancellationToken);
                
                hasMoreBefore = null;
                hasMoreAfter = messages.Count == limit;
                break;
            
            case MessageReadStrategy.Around around:
                int halfLimit = limit / 2;
                
                List<TimelineMessageDto> beforeAnchor = await baseQuery
                    .Where(m => m.Id.CompareTo(around.AnchorId) < 0)
                    .OrderByDescending(m => m.Id)
                    .SelectFacet<TimelineMessageDto>()
                    .Take(halfLimit)
                    .Reverse()
                    .ToListAsync(cancellationToken);
                
                List<TimelineMessageDto> afterAnchor = await baseQuery
                    .Where(m => m.Id.CompareTo(around.AnchorId) >= 0) // can't forget the cursor message too lmao
                    .OrderBy(m => m.Id)
                    .SelectFacet<TimelineMessageDto>()
                    .Take(halfLimit + 1)
                    .ToListAsync(cancellationToken);
                
                messages = [..beforeAnchor, ..afterAnchor];
                hasMoreBefore = beforeAnchor.Count == halfLimit;
                hasMoreAfter = afterAnchor.Count == halfLimit + 1;
                break;
            
            default:
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(readStrategy)] = [
                        "Unknown message read strategy.",
                    ],
                });
        }
        
        return Result<TimelineMessagePage>.Success(new(messages, hasMoreBefore, hasMoreAfter));
    }
}