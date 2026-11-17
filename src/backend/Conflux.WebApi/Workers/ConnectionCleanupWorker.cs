using Conflux.Application.Services;
using Conflux.WebApi.Services;

namespace Conflux.WebApi.Workers;

internal sealed class ConnectionCleanupWorker(
    IConnectionTracker connectionTracker
) : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        // clear all user app session tracking on start.
        await connectionTracker.PruneAllConnections();
    }
}