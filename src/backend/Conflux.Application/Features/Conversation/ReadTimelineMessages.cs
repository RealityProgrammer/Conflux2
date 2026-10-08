using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Conversation;

public sealed record ReadTimelineMessagesQuery(
    Guid ReaderUserId,
    Guid ConversationId,
    MessageReadStrategy ReadStrategy,
    int Count
) : IQuery<Result<TimelineMessagePage>>;

public sealed class ReadTimelineMessagesHandler(
    IMessageRepository messageRepository,
    IConversationAuthorizeService conversationAuthorizeService
) : IQueryHandler<ReadTimelineMessagesQuery, Result<TimelineMessagePage>> {
    public async ValueTask<Result<TimelineMessagePage>> Handle(
        ReadTimelineMessagesQuery query, 
        CancellationToken cancellationToken
    ) {
        if (!await conversationAuthorizeService.CanReadMessage(query.ReaderUserId, query.ConversationId, cancellationToken)) {
            return Errors.Forbidden("User is not allowed to read message in this conversation.");
        }
        
        return await messageRepository.GetTimelineMessages(
            query.ConversationId, 
            query.ReadStrategy,
            query.Count,
            cancellationToken
        );
    }
}