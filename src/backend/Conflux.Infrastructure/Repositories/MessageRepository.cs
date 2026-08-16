using Conflux.Application.Helpers;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class MessageRepository(
    ApplicationDbContext dbContext
) : IMessageRepository {
    public void Add(Message message) {
        dbContext.Messages.Add(message);
    }

    public Task<Message?> GetByIdAsync(Guid messageId, CancellationToken cancellationToken = default) {
        return dbContext.Messages
            .Where(r => r.Id == messageId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<Result<PagedTimelineMessageResult>> GetTimelineMessagesAsync(
        Guid conversationId, 
        MessageLoadDirection? direction, 
        Guid? cursorMessageId, 
        int limit,
        CancellationToken cancellationToken = default
    ) {
        var baseQuery = dbContext.Messages
            .Where(m => m.ConversationId == conversationId);

        // List<TimelineMessageProjection> messages;
        List<MessageProjection> messageProjections;
        bool? hasMoreBefore, hasMoreAfter;
        
        // if no cursor message is provided, mean load latest messages, ignore the direction parameter
        if (cursorMessageId is not { } cursorId) {
            messageProjections = await baseQuery
                .OrderByDescending(m => m.Id)   // uuidv7 btw
                .Select(m => new MessageProjection(
                    m.Id,
                    m.SenderUserId,
                    m.Body,
                    m.Attachments,
                    m.CreatedAt,
                    m.ReplyTo == null ? null : new ReplyMessageProjection(
                        m.ReplyTo.Id,
                        m.ReplyTo.SenderUserId,
                        m.ReplyTo.Body == null ? null : m.ReplyTo.Body.Substring(0, Math.Min(m.ReplyTo.Body.Length, 128)),
                        m.ReplyTo.Body != null && m.ReplyTo.Body.Length > 128,
                        m.ReplyTo.Attachments.Length
                    )
                ))
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
                        .Select(m => new MessageProjection(
                            m.Id,
                            m.SenderUserId,
                            m.Body,
                            m.Attachments,
                            m.CreatedAt,
                            m.ReplyTo == null ? null : new ReplyMessageProjection(
                                m.ReplyTo.Id,
                                m.ReplyTo.SenderUserId,
                                m.ReplyTo.Body == null ? null : m.ReplyTo.Body.Substring(0, Math.Min(m.ReplyTo.Body.Length, 128)),
                                m.ReplyTo.Body != null && m.ReplyTo.Body.Length > 128,
                                m.ReplyTo.Attachments.Length
                            )
                        ))
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
                        .Select(m => new MessageProjection(
                            m.Id,
                            m.SenderUserId,
                            m.Body,
                            m.Attachments,
                            m.CreatedAt,
                            m.ReplyTo == null ? null : new ReplyMessageProjection(
                                m.ReplyTo.Id,
                                m.ReplyTo.SenderUserId,
                                m.ReplyTo.Body == null ? null : m.ReplyTo.Body.Substring(0, Math.Min(m.ReplyTo.Body.Length, 128)),
                                m.ReplyTo.Body != null && m.ReplyTo.Body.Length > 128,
                                m.ReplyTo.Attachments.Length
                            )
                        ))
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
                        .Select(m => new MessageProjection(
                            m.Id,
                            m.SenderUserId,
                            m.Body,
                            m.Attachments,
                            m.CreatedAt,
                            m.ReplyTo == null ? null : new ReplyMessageProjection(
                                m.ReplyTo.Id,
                                m.ReplyTo.SenderUserId,
                                m.ReplyTo.Body == null ? null : m.ReplyTo.Body.Substring(0, Math.Min(m.ReplyTo.Body.Length, 128)),
                                m.ReplyTo.Body != null && m.ReplyTo.Body.Length > 128,
                                m.ReplyTo.Attachments.Length
                            )
                        ))
                        .Take(halfLimit)
                        .Reverse()
                        .ToListAsync(cancellationToken);

                    var after = await baseQuery
                        .Where(m => m.Id.CompareTo(cursorId) >= 0) // can't forget the cursor message too lmao
                        .OrderBy(m => m.Id)
                        .Select(m => new MessageProjection(
                            m.Id,
                            m.SenderUserId,
                            m.Body,
                            m.Attachments,
                            m.CreatedAt,
                            m.ReplyTo == null ? null : new ReplyMessageProjection(
                                m.ReplyTo.Id,
                                m.ReplyTo.SenderUserId,
                                m.ReplyTo.Body == null ? null : m.ReplyTo.Body.Substring(0, Math.Min(m.ReplyTo.Body.Length, 128)),
                                m.ReplyTo.Body != null && m.ReplyTo.Body.Length > 128,
                                m.ReplyTo.Attachments.Length
                            )
                        ))
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

        return Result<PagedTimelineMessageResult>.Success(new(
        [..messageProjections.Select(p => {
            ReplyToMessageDto? replyDto = null;
            
            if (p.ReplyProjection != null) {
                (var snippet, var truncated) = StringHelpers.CutSnippet(p.ReplyProjection.TruncatedBody);
            
                replyDto = new(
                    MessageId: p.ReplyProjection.Id,
                    SenderUserId: p.ReplyProjection.SenderId,
                    BodySnippet: snippet,
                    HasMoreBody: truncated || p.ReplyProjection.IsBodyTruncated,
                    AttachmentCount: p.ReplyProjection.AttachmentCount
                );
            }
            
            return new TimelineMessageProjection(
                p.Id,
                p.SenderId,
                p.Body,
                p.Attachments,
                p.CreatedAt,
                replyDto
            );
        })], hasMoreBefore, hasMoreAfter));
    }

    public async Task<ReplyToMessageDto?> GetReplyMessageByIdAsync(Guid messageId, CancellationToken cancellationToken = default) {
        var projection = await dbContext.Messages
            .Where(m => m.Id == messageId)
            .Select(m => new ReplyMessageProjection(
                m.Id,
                m.SenderUserId,
                m.Body == null ? null : m.Body.Substring(0, Math.Min(m.Body.Length, 128)),
                m.Body != null && m.Body.Length > 128,
                m.Attachments.Length
            ))
            .FirstOrDefaultAsync(cancellationToken);

        if (projection == null) {
            return null;
        }
        
        (var snippet, var truncated) = StringHelpers.CutSnippet(projection.TruncatedBody);

        return new(
            projection.Id,
            projection.SenderId,
            BodySnippet: snippet,
            HasMoreBody: truncated || projection.IsBodyTruncated,
            projection.AttachmentCount
        );
    }

    private sealed record MessageProjection(
        Guid Id,
        Guid SenderId,
        string? Body,
        Attachment[] Attachments,
        DateTimeOffset CreatedAt,
        ReplyMessageProjection? ReplyProjection
    );

    private sealed record ReplyMessageProjection(
        Guid Id, 
        Guid SenderId, 
        string? TruncatedBody, 
        bool IsBodyTruncated, 
        int AttachmentCount
    );
}