using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Conflux.WebApi.Helpers;
using GreenDonut.Data;
using HotChocolate.Types.Pagination;

namespace Conflux.WebApi.GraphQL.Queries;

[QueryType]
public static partial class ConversationParticipantQuery {
    [UseConnection(DefaultPageSize = 20, MaxPageSize = 50), UseFiltering, UseSorting]
    public static async Task<PageConnection<ConversationParticipant>> GetConversationParticipants(
        Guid conversationId,
        QueryContext<ConversationParticipant> queryContext,
        PagingArguments pagingArgs,
        [Service] ICurrentUserService currentUserService,
        [Service] IConversationRepository conversationRepository,
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }
        
        return await conversationRepository
            .AsQueryable()
            .Where(c => c.Id == conversationId && c.Participants.Any(p => p.UserId == userId))
            .SelectMany(c => c.Participants)
            .With(queryContext, DefaultOrder)
            .ToPageAsync(pagingArgs, cancellationToken);
        
        static SortDefinition<ConversationParticipant> DefaultOrder(SortDefinition<ConversationParticipant> sort) =>
            sort.IfEmpty(o => o.AddAscending(t => t.UserId));
    }
}