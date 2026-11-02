using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Conflux.WebApi.Helpers;
using Facet.Extensions;
using GreenDonut.Data;
using HotChocolate.Authorization;
using HotChocolate.Types.Pagination;

namespace Conflux.WebApi.GraphQL.Queries;

[QueryType, Authorize]
internal static partial class MessageQuery {
    [UseConnection(DefaultPageSize = 20, MaxPageSize = 50), UseSorting]
    public static async Task<PageConnection<PinnedMessageDto>> GetPinnedMessages(
        Guid conversationId,
        QueryContext<PinnedMessageDto> queryContext,
        PagingArguments pagingArgs,
        [Service] ICurrentUserService currentUserService,
        [Service] IMessageRepository messageRepository,
        [Service] IConversationParticipantRepository conversationParticipantRepository,
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }

        if (!await conversationParticipantRepository.IsUserJoinedConversation(userId, conversationId, cancellationToken)) {
            throw new GraphQLException(
                Errors.ResourceNotFound("ConversationParticipant", [
                    new(nameof(ConversationParticipant.UserId), userId.ToString()),
                    new(nameof(ConversationParticipant.ConversationId), conversationId.ToString()),
                ]).ToHotChocolateError()
            );
        }

        return await messageRepository
            .AsQueryable()
            .Where(m => m.ConversationId == conversationId && m.Type == MessageType.Message && m.PinnedAt != null)
            .SelectFacet<PinnedMessageDto>()
            .With(queryContext, DefaultOrder)
            .ToPageAsync(pagingArgs, cancellationToken);
        
        static SortDefinition<PinnedMessageDto> DefaultOrder(SortDefinition<PinnedMessageDto> sort) =>
            sort.IfEmpty(o => o.AddDescending(t => t.PinnedAt));
    }
}