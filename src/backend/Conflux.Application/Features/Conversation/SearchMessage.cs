using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Conversation;

public sealed record SearchMessage(
    Guid ConversationId,
    string? Content,
	IReadOnlyCollection<Guid>? SenderIds,
	DateTimeOffset? StartDateTime,
	DateTimeOffset? EndDateTime,
	MessagePinFilter PinFilter,
	Guid? BeforeCursor
) : IQuery<Result<MessageSearchPage>>;

public sealed class SearchMessageHandler(
    ICurrentUserService currentUserService,
    IMessageRepository messageRepository,
    IConversationAuthorizeService conversationAuthorizeService
) : IQueryHandler<SearchMessage, Result<MessageSearchPage>> {
    public async ValueTask<Result<MessageSearchPage>> Handle(SearchMessage query, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        if (!await conversationAuthorizeService.CanReadMessage(userId, query.ConversationId, cancellationToken)) {
            return Errors.Forbidden("User is not allowed to read message in this conversation.");
        }

        return await messageRepository.Search(
            query.ConversationId,
            query.Content,
			query.SenderIds,
			query.StartDateTime,
			query.EndDateTime,
			query.PinFilter,
			query.BeforeCursor,
            40,
            cancellationToken
        );
    }
}
