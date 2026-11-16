using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Conversation;

public sealed record QueryTimelineMessages(
    Guid ConversationId,
    MessageLoadDirection LoadDirection,
    Guid? CursorMessageId,
    int Count
) : IQuery<Result<TimelineMessagePage>>, IConversationCommand;

public sealed class QueryTimelineMessagesValidator : AbstractValidator<QueryTimelineMessages> {
    public QueryTimelineMessagesValidator() {
        RuleFor(x => x.LoadDirection)
            .IsInEnum()
            .WithMessage("Invalid load direction.");

        RuleFor(x => x.CursorMessageId)
            .Null()
            .When(x => x.LoadDirection == MessageLoadDirection.Latest)
            .WithMessage("Querying latest messages must not have cursor message id.");

        RuleFor(x => x.CursorMessageId)
            .NotNull()
            .When(x => x.LoadDirection != MessageLoadDirection.Latest)
            .WithMessage("Querying non-latest messages must have cursor message id.");
    }
}

public sealed class ReadTimelineMessagesHandler(
    ICurrentUserService currentUserService,
    IMessageRepository messageRepository,
    IConversationAuthorizeService conversationAuthorizeService
) : IQueryHandler<QueryTimelineMessages, Result<TimelineMessagePage>> {
    public async ValueTask<Result<TimelineMessagePage>> Handle(
        QueryTimelineMessages query,
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        if (!await conversationAuthorizeService.CanReadMessage(userId, query.ConversationId, cancellationToken)) {
            return Errors.Forbidden("User is not allowed to read message in this conversation.");
        }

        return await messageRepository.GetTimelineMessages(
            userId,
            query.ConversationId,
            query.LoadDirection,
            query.CursorMessageId,
            query.Count,
            cancellationToken
        );
    }
}
