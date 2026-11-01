using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Conflux.Infrastructure;
using Conflux.WebApi.Helpers;
using GreenDonut.Data;
using HotChocolate.Authorization;
using HotChocolate.Types.Pagination;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL.Queries;

[QueryType, Authorize]
public static partial class ConversationQuery {
    [UseConnection(DefaultPageSize = 20, MaxPageSize = 50), UseFiltering, UseSorting]
    public static async Task<PageConnection<Conversation>> GetDirectConversations(
        QueryContext<Conversation> queryContext,
        PagingArguments pagingArgs,
        [Service] ICurrentUserService currentUserService,
        [Service] ApplicationDbContext dbContext,
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }

        return await dbContext.Conversations
            .Where(c => c.Type == ConversationType.Direct)
            .Where(c => c.Participants.Any(p => p.UserId == userId))
            .With(queryContext)
            .ToPageAsync(pagingArgs, cancellationToken);
    }

    public static async Task<PageConnection<ApplicationUser>> GetMentionableUsers(
        Guid conversationId,
        QueryContext<ApplicationUser> queryContext,
        PagingArguments pagingArgs,
        [Service] IConversationRepository conversationRepository,
        CancellationToken cancellationToken
    ) {
        var conversationType = await conversationRepository
            .AsQueryable()
            .Where(c => c.Id == conversationId)
            .Select(c => (ConversationType?)c.Type)
            .FirstOrDefaultAsync(cancellationToken);

        if (conversationType is null) {
            throw new GraphQLException(Errors.ResourceNotFound("Conversation").ToHotChocolateError());
        }
        
        IQueryable<ApplicationUser> query = conversationType.Value == ConversationType.Server
            ? conversationRepository
                .AsQueryable()
                .Where(c => c.Id == conversationId)
                .SelectMany(c => c.Channel!.CommunityServer.Members.Select(m => m.User))
            : conversationRepository
                .AsQueryable()
                .Where(c => c.Id == conversationId)
                .SelectMany(c => c.Participants.Select(p => p.User));
        
        return await query
            .With(queryContext)
            .OrderBy(u => u.UserName)
            .ToPageAsync(pagingArgs, cancellationToken);
    }
}