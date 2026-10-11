using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using GreenDonut.Data;
using HotChocolate.Resolvers;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Collections.Frozen;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class ConversationObjectType : ObjectType<Conversation> {
    protected override void Configure(IObjectTypeDescriptor<Conversation> descriptor) {
        descriptor.BindFieldsExplicitly();
        
        descriptor.Field(c => c.Id);
        descriptor.Field(c => c.LatestMessageAt);
        descriptor.Field(c => c.Channel);
        descriptor.Field("peerUser")
            .Type<ApplicationUserObjectType>()
            .ResolveWith(ResolvePeerUser);

        return;

        async Task<ApplicationUser?> ResolvePeerUser(
            IResolverContext context,
            QueryContext<ApplicationUser> queryContext,
            CancellationToken cancellationToken
        ) {
            var parent = context.Parent<Conversation>();

            var dataLoader = context.DataLoader<IConversationPeerUsersDataLoader>();
            return await dataLoader.With(queryContext).LoadAsync(parent.Id, cancellationToken);
        }
    }

    [DataLoader]
    public static async Task<IReadOnlyDictionary<Guid, ApplicationUser>> GetConversationPeerUsers(
        IReadOnlyList<Guid> conversationIds,
        QueryContext<ApplicationUser> queryContext,
        [Service] IHttpContextAccessor httpContextAccessor,
        [Service] IDbContextFactory<ApplicationDbContext> dbContextFactory,
        CancellationToken cancellationToken
    ) {
        string? idClaim = httpContextAccessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        
        if (conversationIds.Count == 0 || !Guid.TryParse(idClaim, out var sessionUserId)) {
            return FrozenDictionary<Guid, ApplicationUser>.Empty;
        }
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        // pair id querying
        var peerMappings = await dbContext.Conversations
            .AsNoTracking()
            .Where(c => c.Type == Domain.Enums.ConversationType.Direct && conversationIds.Contains(c.Id))
            .Where(c => c.Participants.Count == 2 && c.Participants.Any(p => p.UserId == sessionUserId))
            .Select(c => new {
                ConversationId = c.Id,
                PeerUserId = c.Participants.First(p => p.UserId != sessionUserId).UserId
            })
            .ToListAsync(cancellationToken);

        if (peerMappings.Count == 0) {
            return FrozenDictionary<Guid, ApplicationUser>.Empty;
        }
        
        var peerUserIds = peerMappings.Select(m => m.PeerUserId).Distinct().ToList();
        
        var users = await dbContext.Users
            .AsNoTracking()
            .Where(u => peerUserIds.Contains(u.Id))
            .With(queryContext)
            .ToDictionaryAsync(u => u.Id, cancellationToken);
        
        var result = new Dictionary<Guid, ApplicationUser>(peerMappings.Count);
        foreach (var mapping in peerMappings) {
            if (users.TryGetValue(mapping.PeerUserId, out var peerUser)) {
                result[mapping.ConversationId] = peerUser;
            }
        }

        return result;
    }
}