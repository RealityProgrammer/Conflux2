using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Services;

internal sealed class MessageReactionRepository(
    ApplicationDbContext dbContext
) : IMessageReactionRepository {
    public IQueryable<MessageReaction> AsQueryable() {
        return dbContext.MessageReactions;
    }

    public void Add(MessageReaction value) {
        dbContext.MessageReactions.Add(value);
    }

    public async Task<List<ReactionIconSource>> GetMessageReactionKeys(
        Guid messageId,
        CancellationToken cancellationToken = default
    ) {
        return await dbContext.MessageReactions
            .Where(r => r.MessageId == messageId)
            .Select(r => new ReactionIconSource(r.IconSource, r.UnicodeValue, r.EmojiId))
            .ToListAsync(cancellationToken);
    }

    public async Task UpdateUnicodeReaction(
        Guid messageId,
        string unicodeValue,
        IReadOnlyCollection<Guid> addUserIds,
        IReadOnlyCollection<Guid> removeUserIds,
        CancellationToken cancellationToken = default
    ) {
        await dbContext.Database.ExecuteSqlAsync(
            $$"""
              INSERT INTO 
                  "MessageReactions" ("Id", "MessageId", "IconSource", "UnicodeValue", "EmojiId", "UserIds")
              VALUES 
                  (gen_random_uuid(), {{messageId}}, 0, {{unicodeValue}}, NULL, ARRAY(SELECT DISTINCT unnest({{addUserIds}}::uuid[])))
              ON CONFLICT ("MessageId", "UnicodeValue") WHERE "UnicodeValue" IS NOT NULL
              DO UPDATE SET "UserIds" = ARRAY(
                  SELECT DISTINCT u 
                  FROM unnest(
                      (SELECT COALESCE(array_agg(x), '{}'::uuid[]) FROM unnest("MessageReactions"."UserIds") x WHERE x <> ALL({{removeUserIds}}::uuid[])) || {{addUserIds}}::uuid[]
                  ) AS u
              );
              
              DELETE FROM "MessageReactions" 
              WHERE "MessageId" = {{messageId}} AND "IconSource" = 0 AND "UnicodeValue" = {{unicodeValue}} AND cardinality("UserIds") = 0;
              """,
            cancellationToken
        );
    }

    public async Task UpdateEmojiReaction(
        Guid messageId,
        Guid emojiId,
        IReadOnlyCollection<Guid> addUserIds,
        IReadOnlyCollection<Guid> removeUserIds,
        CancellationToken cancellationToken = default
    ) {
        await dbContext.Database.ExecuteSqlAsync(
            $$"""
             INSERT INTO 
                 "MessageReactions"("Id", "MessageId", "IconSource", "UnicodeValue", "EmojiId", "UserIds")
             VALUES
                 (gen_random_uuid(), {{messageId}}, 1, NULL, {{emojiId}}, ARRAY(SELECT DISTINCT unnest({{addUserIds}}::uuid[])))
             ON CONFLICT ("MessageId", "EmojiId") WHERE "EmojiId" IS NOT NULL
             DO UPDATE SET "UserIds" = ARRAY(
                 SELECT DISTINCT u
                 FROM unnest(
                     (SELECT COALESCE(array_agg(x), '{}'::uuid[]) FROM unnest("MessageReactions"."UserIds") x WHERE x <> ALL({{removeUserIds}}::uuid[])) || {{addUserIds}}::uuid[]
                 ) AS u
             );

             DELETE FROM "MessageReactions" 
             WHERE "MessageId" = {{messageId}} AND "IconSource" = 1 AND "EmojiId" = {{emojiId}} AND cardinality("UserIds") = 0;
             """,
            cancellationToken
        );
    }

    public async Task<Dictionary<Guid, MessageReactionCountSummaryData>> GetReactionSummariesAsync(
        IReadOnlyCollection<Guid> messageIds,
        CancellationToken cancellationToken = default
    ) {
        if (messageIds.Count == 0) return [];

        return await dbContext.Database.SqlQuery<MessageReactionCountSummaryData>(
            $$"""
              SELECT
                  m."MessageId",
                  msg."ConversationId",
                  COALESCE(
                      jsonb_object_agg(
                          CASE 
                              WHEN r."IconSource" = 0 THEN 'unicode.' || r."UnicodeValue"
                              WHEN r."IconSource" = 1 THEN 'emoji.' || r."EmojiId"::text
                          END,
                          cardinality(r."UserIds")
                      ) FILTER (WHERE r."MessageId" IS NOT NULL),
                      '{}'::jsonb
                  )::text AS "ReactionsCountsJson"
              FROM unnest({{messageIds}}::uuid[]) AS m("MessageId")
              JOIN "Messages" msg ON msg."Id" = m."MessageId"
              LEFT JOIN "MessageReactions" r ON r."MessageId" = m."MessageId"
              GROUP BY m."MessageId", msg."ConversationId"
              """
        ).ToDictionaryAsync(s => s.MessageId, s => s, cancellationToken);
    }
}
