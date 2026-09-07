using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
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

    public async Task<Message?> GetById(Guid messageId, bool tracking = false, CancellationToken cancellationToken = default) {
        IQueryable<Message> query = dbContext.Messages;
        query = tracking ? query.AsTracking() : query.AsNoTracking();
            
        return await query.Where(r => r.Id == messageId)
            .Include(r => r.ReplyTo)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<Result<PagedTimelineMessageResult>> GetTimelineMessages(
        Guid conversationId, 
        MessageLoadDirection? direction, 
        Guid? cursorMessageId, 
        int limit,
        CancellationToken cancellationToken = default
    ) {
        var baseQuery = dbContext.Messages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .Include(m => m.ReplyTo);

        List<TimelineMessageDto> messageProjections;
        bool? hasMoreBefore, hasMoreAfter;
        
        // if no cursor message is provided, mean load latest messages, ignore the direction parameter
        if (cursorMessageId is not { } cursorId) {
            messageProjections = await baseQuery
                .OrderByDescending(m => m.Id)   // uuidv7 btw
                .SelectFacet<TimelineMessageDto>()
                .Take(limit)
                .Reverse()  // return the messages in chronological order
                .ToListAsync(cancellationToken);

            hasMoreBefore = messageProjections.Count == limit;
            hasMoreAfter = false;
        } else {
            switch (direction) {
                case MessageLoadDirection.Before: {
                    messageProjections = await baseQuery
                        .Where(m => m.Id.CompareTo(cursorId) < 0)
                        .OrderByDescending(m => m.Id)
                        .SelectFacet<TimelineMessageDto>()
                        .Take(limit)
                        .Reverse()
                        .ToListAsync(cancellationToken);

                    hasMoreBefore = messageProjections.Count == limit;
                    hasMoreAfter = null;
                    break;
                }

                case MessageLoadDirection.After: {
                    messageProjections = await baseQuery
                        .Where(m => m.Id.CompareTo(cursorId) > 0)
                        .OrderBy(m => m.Id)
                        .SelectFacet<TimelineMessageDto>()
                        .Take(limit)
                        .ToListAsync(cancellationToken);

                    hasMoreBefore = null;
                    hasMoreAfter = messageProjections.Count == limit;
                    break;
                }

                case MessageLoadDirection.Around: {
                    int halfLimit = limit / 2;

                    var before = await baseQuery
                        .Where(m => m.Id.CompareTo(cursorId) < 0)
                        .OrderByDescending(m => m.Id)
                        .SelectFacet<TimelineMessageDto>()
                        .Take(halfLimit)
                        .Reverse()
                        .ToListAsync(cancellationToken);

                    var after = await baseQuery
                        .Where(m => m.Id.CompareTo(cursorId) >= 0) // can't forget the cursor message too lmao
                        .OrderBy(m => m.Id)
                        .SelectFacet<TimelineMessageDto>()
                        .Take(halfLimit + 1)
                        .ToListAsync(cancellationToken);

                    messageProjections = [..before, ..after];
                    hasMoreBefore = before.Count == halfLimit;
                    hasMoreAfter = after.Count == halfLimit + 1;
                    break;
                }
                
                case null:
                    return Errors.ValidationErrorsOccurred(new() {
                        [nameof(direction)] = [
                            "Value must be specified when cursor isn't null.",
                        ],
                    });
                
                default:
                    return Errors.ValidationErrorsOccurred(new() {
                        [nameof(direction)] = [
                            "Unexpected enumeration value.",
                        ],
                    });
            }
        }

        return Result<PagedTimelineMessageResult>.Success(new(messageProjections, hasMoreBefore, hasMoreAfter));
    }
}