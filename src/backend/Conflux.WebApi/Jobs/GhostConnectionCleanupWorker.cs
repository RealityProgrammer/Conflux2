using Conflux.WebApi.Services.Implementations;

namespace Conflux.WebApi.Jobs;

internal sealed class GhostConnectionCleanupWorker(
    SignalRConnectionTracker connectionTracker,
    ILogger<GhostConnectionCleanupWorker> logger
) : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        while (!stoppingToken.IsCancellationRequested) {
            try {
                await connectionTracker.PruneConnections();
            } catch (Exception ex) {
                logger.LogError(ex, "Error occurred while sweeping ghost connections.");
            }

            // Run this check every 60 seconds
            await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
        }
    }
}