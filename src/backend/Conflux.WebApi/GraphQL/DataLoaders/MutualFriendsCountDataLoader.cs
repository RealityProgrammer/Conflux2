using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL.DataLoaders;

public sealed class MutualFriendsCountDataLoader : BatchDataLoader<Guid, int> {
    private readonly IDbContextFactory<ApplicationDbContext> _dbContextFactory;
    private readonly Guid _currentUserId;

    public MutualFriendsCountDataLoader(
        IDbContextFactory<ApplicationDbContext> dbContextFactory,
        IHttpContextAccessor httpContextAccessor,
        IBatchScheduler batchScheduler,
        DataLoaderOptions options
    ) : base(batchScheduler, options) {
        _dbContextFactory = dbContextFactory;

        var user = httpContextAccessor.HttpContext?.User;
        var currentUserIdStr = user?.FindFirstValue(JwtRegisteredClaimNames.Sub);
        
        if (!Guid.TryParse(currentUserIdStr, out _currentUserId)) {
            _currentUserId = Guid.Empty;    // probably shouldn't throw exception
        }
    }

    protected override async Task<IReadOnlyDictionary<Guid, int>> LoadBatchAsync(
        IReadOnlyList<Guid> userIds, 
        CancellationToken cancellationToken
    ) {
        await using var dbContext = await _dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        if (_currentUserId == Guid.Empty) {
            return userIds.ToDictionary(id => id, _ => 0);
        }
        
        // get user friend ids
        var friendIds = await dbContext.FriendRequests
            // only get the requests that involves the current user, on the accepted state.
            .Where(f => f.Status == FriendRequestStatus.Accepted)
            .Where(f => f.SenderUserId == _currentUserId || f.ReceiverUserId == _currentUserId)
            .Select(f => f.SenderUserId == _currentUserId ? f.ReceiverUserId : f.SenderUserId)
            .ToListAsync(cancellationToken);

        if (friendIds.Count == 0) {
            return userIds.ToDictionary(id => id, _ => 0);
        }

        var targetAsSender = dbContext.FriendRequests
            .Where(f => f.Status == FriendRequestStatus.Accepted
                        && userIds.Contains(f.SenderUserId)
                        && friendIds.Contains(f.ReceiverUserId)
                        && f.SenderUserId != _currentUserId)
            .Select(f => new { TargetUserId = f.SenderUserId, MutualFriendId = f.ReceiverUserId });
        
        var targetAsReceiver = dbContext.FriendRequests
            .Where(f => f.Status == FriendRequestStatus.Accepted
                        && userIds.Contains(f.ReceiverUserId)
                        && friendIds.Contains(f.SenderUserId)
                        && f.ReceiverUserId != _currentUserId)
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