using Conflux.Application.Services;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using HotChocolate.Resolvers;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using StackExchange.Redis;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class UserType : ObjectType<ApplicationUser> {
    protected override void Configure(IObjectTypeDescriptor<ApplicationUser> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(u => u.Id).IsProjected();
        descriptor.Field(u => u.UserName);
        descriptor.Field(u => u.DisplayName);
        descriptor.Field(u => u.HasAvatar);
        descriptor.Field(u => u.AvatarUpdatedAt);
        descriptor.Field(u => u.Biography);
        descriptor.Field(u => u.Pronouns);
        descriptor.Field(u => u.CreatedAt);
        descriptor.Field(u => u.LastSeenAt);

        descriptor.Field("manualPresenceStatus")
            .Type<EnumType<PresenceStatus>>()
            .ParentRequires<ApplicationUser>(u => new { u.Id })
            .Resolve(ResolveManualPresenceStatus);
        
        descriptor.Field("effectivePresenceStatus")
            .Type<NonNullType<EnumType<PresenceStatus>>>()
            .ParentRequires<ApplicationUser>(u => new {
                u.Id,
                u.ManualPresenceStatus,
            })
            .Resolve(async (context, cancellationContext) => {
                var targetUser = context.Parent<ApplicationUser>();
                var dataLoader = context.DataLoader<EffectivePresenceByIdDataLoader>();
                
                return await dataLoader.LoadAsync(targetUser.Id, cancellationContext);
            });

        descriptor.Field("numMutualFriends")
            .Type<NonNullType<IntType>>()
            .Resolve(async context => {
                var targetUser = context.Parent<ApplicationUser>();
                var dataLoader = context.DataLoader<IMutualFriendsCountDataLoader>();

                return await dataLoader.LoadAsync(targetUser.Id, context.RequestAborted);
            });

        return;

        async Task<PresenceStatus?> ResolveManualPresenceStatus(IResolverContext context, CancellationToken cancellationToken) {
            var targetUser = context.Parent<ApplicationUser>();
            var httpContextAccessor = context.Service<IHttpContextAccessor>();
            
            var userId = httpContextAccessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Sub);

            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var parsedUserId) || parsedUserId != targetUser.Id) {
                return null;
            }
            
            var dataLoader = context.DataLoader<IManualPresenceStatusDataLoader>();

            return await dataLoader.LoadAsync(targetUser.Id, cancellationToken);
        }
    }

    [DataLoader]
    public static async Task<IReadOnlyDictionary<Guid, int>> GetMutualFriendsCount(
        IReadOnlyList<Guid> userIds,
        [Service] IDbContextFactory<ApplicationDbContext> dbContextFactory,
        [Service] IHttpContextAccessor httpContextAccessor,
        CancellationToken cancellationToken = default
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
            .Where(f => 
                f.Status == FriendRequestStatus.Accepted && 
                userIds.Contains(f.SenderUserId) && 
                friendIds.Contains(f.ReceiverUserId) && 
                f.SenderUserId != currentUserId
            )
            .Select(f => new {
                TargetUserId = f.SenderUserId,
                MutualFriendId = f.ReceiverUserId,
            });

        var targetAsReceiver = dbContext.FriendRequests
            .Where(f => 
                f.Status == FriendRequestStatus.Accepted && 
                userIds.Contains(f.ReceiverUserId) && 
                friendIds.Contains(f.SenderUserId) && 
                f.ReceiverUserId != currentUserId
            )
            .Select(f => new {
                TargetUserId = f.ReceiverUserId,
                MutualFriendId = f.SenderUserId,
            });

        var countsByTargetUser = await targetAsSender
            .Concat(targetAsReceiver)
            .GroupBy(x => x.TargetUserId)
            .Select(g => new {
                TargetUserId = g.Key,
                Count = g.Count(),
            })
            .ToDictionaryAsync(x => x.TargetUserId, x => x.Count, cancellationToken);

        return friendIds.ToDictionary(
            id => id,
            id => countsByTargetUser.GetValueOrDefault(id, 0)
        );
    }

    [DataLoader]
    public static async Task<IReadOnlyDictionary<Guid, PresenceStatus>> GetManualPresenceStatus(
        IReadOnlyList<Guid> keys,
        [Service] IDbContextFactory<ApplicationDbContext> dbContextFactory,
        [Service] IConnectionMultiplexer connectionMultiplexer,
        [Service] IPresenceCacheService presenceCacheService,
        CancellationToken cancellationToken = default
    ) {
        var redisDatabase = connectionMultiplexer.GetDatabase();

        var results = new Dictionary<Guid, PresenceStatus>();
        var missingKeys = new List<Guid>();

        var redisKeys = keys.Select(id => (RedisKey)$"presence:manual:{id}").ToArray();
        var cachedValues = await redisDatabase.StringGetAsync(redisKeys);

        for (int i = 0; i < keys.Count; i++) {
            RedisValue value = cachedValues[i];
            
            if (value is { HasValue: true, IsInteger: true }) {
                results[keys[i]] = (PresenceStatus)(int)value;
            } else {
                missingKeys.Add(keys[i]); // cache miss
            }
        }

        // bail out from sql query if no cache miss (one can only dream of such scenario)
        if (missingKeys.Count == 0) {
            return results;
        }

        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        var statuses = await dbContext.Users
            .AsNoTracking()
            .Where(u => missingKeys.Contains(u.Id))
            .Select(u => new {
                u.Id,
                u.ManualPresenceStatus,
            })
            .ToDictionaryAsync(u => u.Id, u => u.ManualPresenceStatus, cancellationToken);

        // backfill redis cache
        await presenceCacheService.SetManualStatuses(statuses);

        foreach ((Guid userId, PresenceStatus presenceStatus) in statuses) {
            results[userId] = presenceStatus;
        }
        
        foreach (Guid key in missingKeys) {
            results.TryAdd(key, PresenceStatus.Offline);
        }

        return results;
    }

    [DataLoader]
    public static async Task<IReadOnlyDictionary<Guid, PresenceStatus>> GetEffectivePresenceByIdAsync(
        IReadOnlyList<Guid> keys,
        [Service] IPresenceService presenceService
    ) {
        return await presenceService.GetEffectivePresenceStatuses(keys);
    }
}