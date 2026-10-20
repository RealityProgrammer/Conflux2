using Conflux.WebApi.Services.Implementations;

namespace Conflux.WebApi.Jobs;

internal sealed class GhostConnectionCleanupWorker(
    SignalRConnectionTracker connectionTracker,
    ILogger<GhostConnectionCleanupWorker> logger
) : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        logger.LogInformation("Started.");
        
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));

        try {
            while (await timer.WaitForNextTickAsync(stoppingToken)) {
                try {
                    await connectionTracker.PruneConnections();
                } catch (OperationCanceledException) {
                    throw;
                } catch (Exception e) {
                    logger.LogError(e, "Exception thrown while cleaning ghost connections.");
                }
            }
        } catch (OperationCanceledException) {
            logger.LogInformation("Stopping...");
        }
    }
}