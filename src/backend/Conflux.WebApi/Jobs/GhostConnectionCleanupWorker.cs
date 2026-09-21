using Conflux.Application.Services;
using Conflux.WebApi.Services.Implementations;
using StackExchange.Redis;

namespace Conflux.WebApi.Jobs;

internal sealed class GhostConnectionCleanupWorker(
    IConnectionMultiplexer connectionMultiplexer,
    IServiceProvider serviceProvider,
    SignalRConnectionTracker connectionTracker,
    ILogger<GhostConnectionCleanupWorker> logger
) : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        var db = connectionMultiplexer.GetDatabase();

        while (!stoppingToken.IsCancellationRequested) {
            try {
                long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

                // get all users whose last heartbeat is older than NOW
                var expiredUserIds = await db.SortedSetRangeByScoreAsync("presence:active_users", start: 0, stop: now - 1);

                if (expiredUserIds.Length > 0) {
                    using var scope = serviceProvider.CreateScope();
                    var presenceService = scope.ServiceProvider.GetRequiredService<IPresenceService>();

                    foreach (RedisValue redisVal in expiredUserIds) {
                        if (Guid.TryParse(redisVal.ToString(), out var userId)) {
                            // double check just to be safe
                            await db.SortedSetRemoveRangeByScoreAsync($"presence:connections:{userId}", 0, now - 1);
                            long activeConnections = await db.SortedSetLengthAsync($"presence:connections:{userId}");

                            if (activeConnections == 0) {
                                await presenceService.UserDisconnected(userId);
                                await db.SortedSetRemoveAsync("presence:active_users", redisVal);
                                logger.LogInformation("Swept ghost connection for user {UserId}", userId);
                            } else {
                                await db.SortedSetAddAsync("presence:active_users", redisVal, now + SignalRConnectionTracker.TimeToLive);
                            }
                        }
                    }
                }
            } catch (Exception ex) {
                logger.LogError(ex, "Error occurred while sweeping ghost connections.");
            }

            // Run this check every 60 seconds
            await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
        }
    }
}