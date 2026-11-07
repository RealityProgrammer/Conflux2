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

    public async Task<Result<MessageSearchPage>> Search(Guid conversationId, string? content, IReadOnlyCollection<Guid>? senderIds, DateTimeOffset? startDateTime, DateTimeOffset? endDateTime, Guid? beforeCursor, int limit, CancellationToken cancellationToken = default)
    {
        var query = dbContext.Messages
            .Where(m => 
                m.ConversationId == conversationId
			);

		if (!string.IsNullOrEmpty(content)) {
			query = query
				.Where(m => 
					m.SearchVector.Matches(EF.Functions.WebSearchToTsQuery("simple", content))
				);
		}

		if (senderIds is { Count: > 0}) {
			query = query
				.Where(m => senderIds.Contains(m.Id));
		}

		if (startDateTime is { } startTime) {
			query = query
				.Where(m => m.CreatedAt >= startTime);
		}

		if (endDateTime is { } endTime) {
			query = query
				.Where(m => m.CreatedAt <= endTime);
		}

		if (beforeCursor is { } before) {
			query = query
				.Where(m => m.Id.CompareTo(before) < 0);
		}

		var page = await query
			.OrderByDescending(m => m.CreatedAt)
            .SelectFacet<MessageSearchDto>()
            .Take(limit)
            .ToListAsync(cancellationToken);

        return Result<MessageSearchPage>.Success(new(page, page.Count == limit, page.Count > 0 ? page[^1].Id : null));
    }
}
