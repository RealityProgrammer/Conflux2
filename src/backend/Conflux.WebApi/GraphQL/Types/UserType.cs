using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class UserType : ObjectType<ApplicationUser> {
    protected override void Configure(IObjectTypeDescriptor<ApplicationUser> descriptor) {
        descriptor.BindFieldsExplicitly();
        
        descriptor.Field(u => u.Id);
        descriptor.Field(u => u.UserName);
        descriptor.Field(u => u.DisplayName);
        descriptor.Field(u => u.HasAvatar);
        descriptor.Field(u => u.AvatarUpdatedAt);
        descriptor.Field(u => u.Biography);
        descriptor.Field(u => u.Pronouns);
        descriptor.Field(u => u.CreatedAt);
        descriptor.Field(u => u.LastSeenAt);
        
        // TODO: only allow user to read their own manual presence status
        descriptor.Field(u => u.ManualPresenceStatus);

        descriptor.Field("numMutualFriends")
            .Type<NonNullType<IntType>>()
            .Resolve(async context => {
                var targetUser = context.Parent<ApplicationUser>();
                var dataLoader = context.DataLoader<IMutualFriendsCountDataLoader>();
                
                return await dataLoader.LoadAsync(targetUser.Id, context.RequestAborted);
            });
    }
    
    [DataLoader]
    public static async Task<IReadOnlyDictionary<Guid, int>> GetMutualFriendsCount(
        IReadOnlyList<Guid> userIds,
        [Service] IDbContextFactory<ApplicationDbContext> dbContextFactory,
        [Service] IHttpContextAccessor httpContextAccessor,
        CancellationToken cancellationToken
    ) {
        var idClaim = httpContextAccessor.HttpContext!.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var currentUserId)) {
            currentUserId = Guid.Empty;
        }
        
        if (currentUserId == Guid.Empty) {
            return userIds.ToDictionary(id => id, _ => 0);
        }
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        // get user friend ids
        var friendIds = await dbContext.FriendRequests
            // only get the requests that involves the current user, on the accepted state.
            .Where(f => f.Status == FriendRequestStatus.Accepted)
            .Where(f => f.SenderUserId == currentUserId || f.ReceiverUserId == currentUserId)
            .Select(f => f.SenderUserId == currentUserId ? f.ReceiverUserId : f.SenderUserId)
            .ToListAsync(cancellationToken);

        if (friendIds.Count == 0) {
            return userIds.ToDictionary(id => id, _ => 0);
        }

        var targetAsSender = dbContext.FriendRequests
            .Where(f => f.Status == FriendRequestStatus.Accepted
                        && userIds.Contains(f.SenderUserId)
                        && friendIds.Contains(f.ReceiverUserId)
                        && f.SenderUserId != currentUserId)
            .Select(f => new { TargetUserId = f.SenderUserId, MutualFriendId = f.ReceiverUserId });
        
        var targetAsReceiver = dbContext.FriendRequests
            .Where(f => f.Status == FriendRequestStatus.Accepted
                        && userIds.Contains(f.ReceiverUserId)
                        && friendIds.Contains(f.SenderUserId)
                        && f.ReceiverUserId != currentUserId)
            .Select(f => new { TargetUserId = f.ReceiverUserId, MutualFriendId = f.SenderUserId });

        var countsByTargetUser = await targetAsSender
            .Concat(targetAsReceiver)
            .GroupBy(x => x.TargetUserId)
            .Select(g => new { TargetUserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.TargetUserId, x => x.Count, cancellationToken);

        return friendIds.ToDictionary(
            id => id,
            id => countsByTargetUser.GetValueOrDefault(id, 0)
        );
    }
}