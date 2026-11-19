using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq.Expressions;
using System.Text.Json;

namespace Conflux.Infrastructure.Repositories;

internal sealed class MessageRepository(
    ApplicationDbContext dbContext,
    ILogger<MessageRepository> logger
) : IMessageRepository {
    public IQueryable<Message> AsQueryable() {
        return dbContext.Messages;
    }

    public void Add(Message message) {
        dbContext.Messages.Add(message);
    }

    public async Task<Result<TimelineMessagePage>> GetTimelineMessages(
        Guid userId,
        Guid conversationId,
        MessageLoadDirection loadDirection,
        Guid? cursorMessageId,
        int limit,
        CancellationToken cancellationToken = default
    ) {
        List<TimelineMessageDto> messages;
        bool? hasMoreBefore, hasMoreAfter;

        var baseQuery = dbContext.Messages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .Include(m => m.ReplyTo)
            .Include(m => m.Attachments.OrderBy(a => a.Order))
            .Include(m => m.Sender);

        switch (loadDirection) {
            case MessageLoadDirection.Latest:
                messages = await baseQuery
                    .OrderByDescending(m => m.Id)
                    .Select(SelectTimelineMessages)
                    .Take(limit)
                    .Reverse()  // return the messages in chronological order
                    .ToListAsync(cancellationToken);

                hasMoreBefore = messages.Count == limit;
                hasMoreAfter = false;
                break;

            case MessageLoadDirection.Before: {
                if (cursorMessageId is not { } cursorId) goto case MessageLoadDirection.Latest;

                messages = await baseQuery
                    .Where(m => m.Id.CompareTo(cursorId) < 0)
                    .OrderByDescending(m => m.Id)
                    .Select(SelectTimelineMessages)
                    .Take(limit)
                    .Reverse()
                    .ToListAsync(cancellationToken);

                hasMoreBefore = messages.Count == limit;
                hasMoreAfter = null;
                break;
            }

            case MessageLoadDirection.After: {
                if (cursorMessageId is not { } cursorId) goto case MessageLoadDirection.Latest;

                messages = await baseQuery
                    .Where(m => m.Id.CompareTo(cursorId) > 0)
                    .OrderBy(m => m.Id)
                    .Select(SelectTimelineMessages)
                    .Take(limit)
                    .ToListAsync(cancellationToken);

                hasMoreBefore = null;
                hasMoreAfter = messages.Count == limit;
                break;
            }

            case MessageLoadDirection.Around: {
                if (cursorMessageId is not { } cursorId) goto case MessageLoadDirection.Latest;

                int halfLimit = limit / 2;

                List<TimelineMessageDto> beforeAnchor = await baseQuery
                    .Where(m => m.Id.CompareTo(cursorId) < 0)
                    .OrderByDescending(m => m.Id)
                    .Select(SelectTimelineMessages)
                    .Take(halfLimit)
                    .Reverse()
                    .ToListAsync(cancellationToken);

                List<TimelineMessageDto> afterAnchor = await baseQuery
                    .Where(m => m.Id.CompareTo(cursorId) >= 0) // can't forget the cursor message too lmao
                    .OrderBy(m => m.Id)
                    .Select(SelectTimelineMessages)
                    .Take(halfLimit + 1)
                    .ToListAsync(cancellationToken);

                messages = [.. beforeAnchor, .. afterAnchor];
                hasMoreBefore = beforeAnchor.Count == halfLimit;
                hasMoreAfter = afterAnchor.Count == halfLimit + 1;
                break;
            }

            default:
                logger.LogWarning("Undefined load direction, fallback to Latest.");
                goto case MessageLoadDirection.Latest;
        }

        // messages loaded, query the reactions separately to keep thing simple.
        List<Guid> messageIds = [.. messages.Select(m => m.Id)];

        var reactionsSummaries = await dbContext.Database.SqlQuery<RawMessageReactionsSummary>(
             $$"""
             SELECT
                 m."MessageId",
                 COALESCE(
                     json_object_agg(
                         CASE 
                             WHEN r."IconSource" = 0 THEN 'unicode.' || r."UnicodeValue"
                             WHEN r."IconSource" = 1 THEN 'emoji.' || r."EmojiId"::text
                         END,
                         cardinality(r."UserIds")
                         ORDER BY r."CreatedAt" ASC
                     ) FILTER (WHERE r."MessageId" IS NOT NULL),
                     '{}'::json
                 )::text AS "ReactionsCountsJson",
                 COALESCE(
                     jsonb_agg(
                         CASE 
                             WHEN r."IconSource" = 0 THEN 'unicode.' || r."UnicodeValue"
                             WHEN r."IconSource" = 1 THEN 'emoji.' || r."EmojiId"::text
                         END
                     ) FILTER (WHERE r."MessageId" IS NOT NULL AND {{userId}} = ANY(r."UserIds")),
                     '[]'::jsonb
                 )::text AS "UserReactionsJson"
             FROM unnest({{messageIds}}::uuid[]) AS m("MessageId")
             JOIN "MessageReactions" r ON r."MessageId" = m."MessageId"
             GROUP BY m."MessageId";
             """
        ).ToDictionaryAsync(s => s.MessageId, s => s, cancellationToken);

        // snitch the messages and reactions together.
        for (int i = 0; i < messages.Count; i++) {
            var message = messages[i];

            if (!reactionsSummaries.TryGetValue(message.Id, out var reactionsSummary)) continue;

            messages[i] = message with {
                ReactionsCounts = reactionsSummary.ReactionsCounts,
                UserReactionKeys = reactionsSummary.UserReactionKeys,
            };
        }

        return Result<TimelineMessagePage>.Success(new(messages, hasMoreBefore, hasMoreAfter));
    }

    private sealed class RawMessageReactionsSummary {
        public Guid MessageId { get; set; }
        public string ReactionsCountsJson { get; set; } = "{}";
        public string UserReactionsJson { get; set; } = "[]";

        [NotMapped]
        public Dictionary<string, int> ReactionsCounts => JsonSerializer.Deserialize<Dictionary<string, int>>(ReactionsCountsJson) ?? [];

        [NotMapped]
        public string[] UserReactionKeys => JsonSerializer.Deserialize<string[]>(UserReactionsJson) ?? [];
    }

    private static Expression<Func<Message, TimelineMessageDto>> SelectTimelineMessages {
        get {
            return message => new(
                message.Id,
                message.Type,
                message.Sender == null ? null : new TimelineMessageSenderDto(message.Sender.Id, message.Sender.DisplayName, message.Sender.AvatarVersion),
                message.Body,
                message.Attachments.Select(a => new MessageAttachmentDto(a.Id, a.ContentType, a.FileName)).ToList(),
                message.ReplyTo == null ? null : new TimelineMessageReplyDto(message.ReplyTo.Id, new(message.ReplyTo.Sender!.Id, message.ReplyTo.Sender!.DisplayName, message.ReplyTo.Sender!.AvatarVersion), message.ReplyTo.Body, message.Attachments.Count),
                message.Properties,
                message.CreatedAt,
                message.UpdatedAt,
                message.ConversationId,
                message.PinnedAt != null,
                null,
                null
            );
        }
    }

    public async Task<Result<MessageSearchPage>> Search(Guid conversationId, string? content, IReadOnlyCollection<Guid>? senderIds, DateTimeOffset? startDateTime, DateTimeOffset? endDateTime, MessagePinFilter pinFilter, Guid? beforeCursor, int limit, CancellationToken cancellationToken = default) {
        var query = dbContext.Messages.Where(m =>
            m.ConversationId == conversationId
        );

        if (!string.IsNullOrEmpty(content)) {
            query = query.Where(m =>
                m.SearchVector.Matches(EF.Functions.WebSearchToTsQuery("simple", content))
            );
        }

        if (senderIds is { Count: > 0 }) {
            query = query.Where(m => senderIds.Contains(m.Id));
        }

        if (startDateTime is { } startTime) {
            query = query.Where(m => m.CreatedAt >= startTime);
        }

        if (endDateTime is { } endTime) {
            query = query.Where(m => m.CreatedAt <= endTime);
        }

        if (beforeCursor is { } before) {
            query = query.Where(m => m.Id.CompareTo(before) < 0);
        }

        switch (pinFilter) {
            case MessagePinFilter.Pin:
                query = query.Where(m => m.PinnedAt != null);
                break;

            case MessagePinFilter.Unpin:
                query = query.Where(m => m.PinnedAt == null);
                break;
        }

        var page = await query
            .OrderByDescending(m => m.CreatedAt)
            .SelectFacet<MessageSearchDto>()
            .Take(limit)
            .ToListAsync(cancellationToken);

        return Result<MessageSearchPage>.Success(new(page, page.Count == limit, page.Count > 0 ? page[^1].Id : null));
    }

    public async Task<KeyedPaginatedPage<DateTimeOffset, PinnedMessageDto>> GetPinnedMessages(
        Guid conversationId,
        DateTimeOffset? before,
        DateTimeOffset? after,
        int limit,
        CancellationToken cancellationToken = default
    ) {
        var query = dbContext.Messages.Where(m =>
            m.ConversationId == conversationId && m.PinnedAt != null
        );

        if (before.HasValue) {
            query = query.Where(m => m.PinnedAt < before);
        }
        else if (after.HasValue) {
            query = query.Where(m => m.PinnedAt > after);
        }

        var messages = await query.OrderByDescending(m => m.PinnedAt)
            .Take(limit + 1)    // + 1 to trim away
            .SelectFacet<PinnedMessageDto>()
            .ToListAsync(cancellationToken);

        if (messages.Count == 0) {
            return new(default, default, false, false, []);
        }

        bool hasMore = messages.Count > limit;
        bool hasPreviousPage, hasNextPage;

        if (hasMore) {
            messages.RemoveAt(messages.Count - 1); // trim last one away
        }

        if (before.HasValue) {
            hasNextPage = hasMore;
            hasPreviousPage = true;
        }
        else if (after.HasValue) {
            hasPreviousPage = hasMore;
            hasNextPage = true;
        }
        else {
            hasPreviousPage = false;
            hasNextPage = hasMore;
        }

        return new(
            messages[0].PinnedAt!.Value,
            messages[^1].PinnedAt!.Value,
            hasPreviousPage,
            hasNextPage,
            messages
        );
    }
}
