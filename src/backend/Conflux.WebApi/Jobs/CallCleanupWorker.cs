using Conflux.WebApi.Services;

namespace Conflux.WebApi.Jobs;

internal sealed class CallCleanupWorker(
    IServiceScopeFactory scopeFactory
) : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        using var scope = scopeFactory.CreateScope();
        
        var callingService = scope.ServiceProvider.GetRequiredService<ICallingService>();
        await callingService.CleanCallStates();
    }
}