using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;
using PinnedMessageDto = Conflux.Domain.Dto.PinnedMessageDto;

namespace Conflux.Application.Features.Conversation;

public sealed record QueryPinnedMessages(
    Guid ConversationId,
    DateTimeOffset? Before,
    DateTimeOffset? After
) : IQuery<Result<KeyedPaginatedPage<DateTimeOffset, PinnedMessageDto>>>;

public sealed class QueryPinnedMessagesHandler(
    ICurrentUserService currentUserService,
    IMessageRepository messageRepository,
    IConversationAuthorizeService conversationAuthorizeService
) : IQueryHandler<QueryPinnedMessages, Result<KeyedPaginatedPage<DateTimeOffset, PinnedMessageDto>>> {
    public async ValueTask<Result<KeyedPaginatedPage<DateTimeOffset, PinnedMessageDto>>> Handle(
        QueryPinnedMessages query, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        if (!await conversationAuthorizeService.CanReadMessage(userId, query.ConversationId, cancellationToken)) {
            return Errors.Forbidden("User is not allowed to read message in this conversation.");
        }

        var page = await messageRepository
            .GetPinnedMessages(query.ConversationId, query.Before, query.After, 40, cancellationToken);

        return Result<KeyedPaginatedPage<DateTimeOffset, PinnedMessageDto>>.Success(page);
    }
}