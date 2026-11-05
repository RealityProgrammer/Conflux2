using Conflux.Domain.Repositories;

namespace Conflux.WebApi.Workers;

internal sealed partial class MentionNotificationCleanupWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<MentionNotificationCleanupWorker> logger
) : BackgroundService {
    private static readonly TimeSpan NotificationAge = TimeSpan.FromDays(7);
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        logger.LogInformation("Started.");

        // clean the database once every hour
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));

        try {
            while (await timer.WaitForNextTickAsync(stoppingToken)) {
                try {
                    await PerformCleanupAsync(stoppingToken);
                } catch (OperationCanceledException) {
                    throw;
                } catch (Exception e) {
                    logger.LogError(e, "Exception thrown while cleaning up invitations.");
                }
            }
        } catch (OperationCanceledException) {
            logger.LogInformation("Stopping...");
        }
    }

    private async Task PerformCleanupAsync(CancellationToken stoppingToken) {
        using var scope = scopeFactory.CreateScope();

        var notificationRepository = scope.ServiceProvider.GetRequiredService<INotificationWriteRepository>();
        
        try {
            logger.LogInformation("Starting cleanup...");

            int deletedCount = await notificationRepository.PruneReadMentionNotifications(NotificationAge, stoppingToken);

            if (deletedCount > 0) {
                LogDeletedCount(logger, deletedCount);
            }
        } catch (Exception ex) {
            logger.LogError(ex, "Exception thrown while cleaning up.");
        }
    }
    
    [LoggerMessage(LogLevel.Information, "Deleted {count} inactive/expired.")]
    private static partial void LogDeletedCount(ILogger logger, int count);
}