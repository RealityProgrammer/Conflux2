using Conflux.Application.Services;

namespace Conflux.WebApi.Workers;

internal sealed class PurgePendingDeleteAccountsWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<PurgePendingDeleteAccountsWorker> logger
) : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        logger.LogInformation("Started.");

        using var timer = new PeriodicTimer(TimeSpan.FromHours(24));

        try {
            while (await timer.WaitForNextTickAsync(stoppingToken)) {
                logger.LogInformation("Start purging pending delete accounts...");
                
                try {
                    using var scope = scopeFactory.CreateScope();
                    var purgingService = scope.ServiceProvider.GetRequiredService<IAccountPurgingService>();
                    
                    await purgingService.PurgePendingDeleteAccounts();
                } catch (OperationCanceledException) {
                    throw;
                } catch (Exception e) {
                    logger.LogError(e, "Exception thrown while deleting accounts.");
                }
            }
        } catch (OperationCanceledException) {
            logger.LogInformation("Stopping...");
        }
    }
}