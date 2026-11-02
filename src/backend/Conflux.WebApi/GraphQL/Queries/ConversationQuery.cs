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

    [UseConnection(DefaultPageSize = 20, MaxPageSize = 50), UseFiltering]
    public static async Task<PageConnection<ApplicationUser>> GetMentionableUsers(
        Guid conversationId,
        QueryContext<ApplicationUser> queryContext,
        PagingArguments pagingArgs,
        [Service] ICurrentUserService currentUserService,
        [Service] IConversationRepository conversationRepository,
        [Service] IServerMemberReadRepository serverMemberReadRepository,
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }
        
        var conversationData = await conversationRepository
            .AsQueryable()
            .Where(c => c.Id == conversationId)
            .Select(c => new {
                c.Type,
                ServerId = c.Channel != null ? (Guid?)c.Channel.CommunityServer.Id : null,
                IsParticipant = c.Participants.Any(p => p.UserId == userId)
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (conversationData is null) {
            throw new GraphQLException(Errors.ResourceNotFound("Conversation").ToHotChocolateError());
        }
        
        bool hasAccess = conversationData.Type switch {
            ConversationType.Server => conversationData.ServerId.HasValue && 
               await serverMemberReadRepository
                   .AsQueryable()
                   .AnyAsync(
                       sm => sm.CommunityServerId == conversationData.ServerId.Value && sm.UserId == userId, 
                       cancellationToken
                    ),
            
            ConversationType.Direct => conversationData.IsParticipant,
            
            _ => false,
        };
        
        if (!hasAccess) {
            throw new GraphQLException(Errors.ResourceNotFound("Conversation").ToHotChocolateError());
        }
        
        IQueryable<ApplicationUser> query = conversationData.Type == ConversationType.Server
            ? conversationRepository
                .AsQueryable()
                .TagWith("E")
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