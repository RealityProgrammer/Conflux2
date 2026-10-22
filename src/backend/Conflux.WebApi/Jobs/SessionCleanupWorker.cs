using Conflux.Application.Services;

namespace Conflux.WebApi.Jobs;

internal sealed partial class SessionCleanupWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<SessionCleanupWorker> logger
) : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        logger.LogInformation("Started.");

        using var timer = new PeriodicTimer(TimeSpan.FromHours(24));

        try {
            while (await timer.WaitForNextTickAsync(stoppingToken)) {
                try {
                    using var scope = scopeFactory.CreateScope();
                    var jwtStorage = scope.ServiceProvider.GetRequiredService<IJwtStorage>();

                    int cleanAmount = await jwtStorage.CleanupExpiredTokens(stoppingToken);
                    LogSuccessfullyCleanedUp(logger, cleanAmount);
                } catch (OperationCanceledException) {
                    throw;
                } catch (Exception e) {
                    logger.LogError(e, "Exception thrown while cleaning session.");
                }
            }
        } catch (OperationCanceledException) {
            logger.LogInformation("Stopping...");
        }
    }
    
    [LoggerMessage(LogLevel.Information, "Successfully cleaned up {count} rows.")]
    private static partial void LogSuccessfullyCleanedUp(ILogger logger, int count);
}