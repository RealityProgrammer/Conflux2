using Conflux.Application.Dto;
using Conflux.Application.Features.Servers;
using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using Conflux.WebApi.GraphQL.Dto;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Collections.Frozen;

namespace Conflux.WebApi.GraphQL;

internal static class DataLoaders {
    [DataLoader]
    public static async Task<Dictionary<MemberAuthorizeKey, Domain.Result<MemberAuthorizeInfoDto>>> GetMemberAuthorizationInfo(
        IReadOnlyList<MemberAuthorizeKey> keys,
        CancellationToken cancellationToken,
        [Service] IMediator mediator
    ) {
        var authResults = await mediator.Send(
            new GetMembersServerAuthorizationInfoQuery(keys), 
            cancellationToken
        );

        return keys.ToDictionary(
            key => key,
            key => {
                // the results are keyed by member id, if changed, change in the GetMembersAuthorizationInfoHandler too
                var result = authResults[key.MemberId];

                if (!result.IsSuccess)
                    return Domain.Result<MemberAuthorizeInfoDto>.Failure(result.Error);

                return Domain.Result<MemberAuthorizeInfoDto>.Success(new(
                    result.Value!.AuthorizeLevel,
                    [..result.Value.EffectivePermissions.Select(kvp => new PermissionEntry(kvp.Key, kvp.Value))]
                ));
            }
        );
    }

    [DataLoader]
    public static async Task<IReadOnlyDictionary<Guid, int>> GetCommunityServersMemberCount(
        IReadOnlyList<Guid> serverIds,
        CancellationToken cancellationToken,
        [Service] IDbContextFactory<ApplicationDbContext> dbContextFactory
    ) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        if (serverIds.Count == 0) {
            return FrozenDictionary<Guid, int>.Empty;
        }
        
        var counts = await dbContext.CommunityServerMembers
            .AsNoTracking()
            .Where(m => serverIds.Contains(m.CommunityServerId) && m.Status == MembershipStatus.Active)
            .GroupBy(m => m.CommunityServerId)
            .Select(g => new {
                ServerId = g.Key,
                Count = g.Count(),
            })
            .ToDictionaryAsync(x => x.ServerId, x => x.Count, cancellationToken);
    
        return serverIds.ToDictionary(id => id, id => counts.GetValueOrDefault(id, 0));
    }
    
    [DataLoader]
    public static async Task<IReadOnlyDictionary<Guid, int>> GetRolesMemberCount(
        IReadOnlyList<Guid> roleIds,
        CancellationToken cancellationToken,
        [Service] IDbContextFactory<ApplicationDbContext> dbContextFactory
    ) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        if (roleIds.Count == 0) {
            return FrozenDictionary<Guid, int>.Empty;
        }

        var counts = await dbContext.CommunityServerMemberRoles
            .AsNoTracking()
            .Where(r => roleIds.Contains(r.RoleId))
            .GroupBy(mr => mr.RoleId)
            .Select(g => new {
                RoleId = g.Key,
                Count = g.Count(),
            })
            .ToDictionaryAsync(x => x.RoleId, x => x.Count, cancellationToken);
        
        return roleIds.ToDictionary(id => id, id => counts.GetValueOrDefault(id, 0));
    }

    [DataLoader]
    public static async Task<IReadOnlyDictionary<Guid, int>> GetMutualFriendsCount(
        IReadOnlyList<Guid> userIds,
        CancellationToken cancellationToken,
        IDbContextFactory<ApplicationDbContext> dbContextFactory,
        IHttpContextAccessor httpContextAccessor
    ) {
        var idClaim = httpContextAccessor.HttpContext!.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        
        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var currentUserId)) {
            currentUserId = Guid.Empty;
        }
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        if (currentUserId == Guid.Empty) {
            return userIds.ToDictionary(id => id, _ => 0);
        }
        
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