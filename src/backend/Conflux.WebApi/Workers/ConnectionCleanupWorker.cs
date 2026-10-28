using Conflux.WebApi.Services;

namespace Conflux.WebApi.Workers;

internal sealed class ConnectionCleanupWorker(
    ISignalRConnectionTracker connectionTracker,
    ILogger<ConnectionCleanupWorker> logger
) : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        // clear all user app session tracking on start.
        await connectionTracker.PruneAllConnections();
    }
}