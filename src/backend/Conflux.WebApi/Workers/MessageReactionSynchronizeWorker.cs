using Conflux.Application.Services;

namespace Conflux.WebApi.Workers;

internal sealed class MessageReactionSynchronizeWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<DailyPurgeWorker> logger
) : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        logger.LogInformation("Started.");
        
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));

        try {
            while (await timer.WaitForNextTickAsync(stoppingToken)) {
                try {
                    await SynchronizeReactions(stoppingToken);
                } catch (OperationCanceledException) {
                    throw;
                } catch (Exception e) {
                    logger.LogError(e, "Exception thrown while synchronizing message reactions.");
                }
            }
        } catch (OperationCanceledException) {
            logger.LogInformation("Stopping...");
        }
    }

    private async Task SynchronizeReactions(CancellationToken cancellationToken) {
        using var scope = scopeFactory.CreateScope();

        var batcher = scope.ServiceProvider.GetRequiredService<IMessageReactionBatcher>();

        await batcher.Synchronize(cancellationToken);
    }
}