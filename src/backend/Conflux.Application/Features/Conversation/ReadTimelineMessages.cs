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
    IMessageRepository messageRepository
) : IQueryHandler<ReadTimelineMessagesQuery, Result<TimelineMessagePage>> {
    public async ValueTask<Result<TimelineMessagePage>> Handle(
        ReadTimelineMessagesQuery query, 
        CancellationToken cancellationToken
    ) {
        return await messageRepository.GetTimelineMessages(
            query.ConversationId, 
            query.ReadStrategy,
            query.Count,
            cancellationToken
        );
    }
}