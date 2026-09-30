using Conflux.Domain.Repositories;

namespace Conflux.WebApi.Jobs;

internal sealed partial class InvitationCleanupWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<InvitationCleanupWorker> logger
) : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        logger.LogInformation("Started.");

        // clean the database once every hour
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));

        try {
            while (await timer.WaitForNextTickAsync(stoppingToken)) {
                await PerformCleanupAsync(stoppingToken);
            }
        } catch (OperationCanceledException) {
            logger.LogInformation("Stopping...");
        }
    }

    private async Task PerformCleanupAsync(CancellationToken stoppingToken) {
        using var scope = scopeFactory.CreateScope();

        var invitationRepository = scope.ServiceProvider.GetRequiredService<IInvitationRepository>();

        try {
            logger.LogInformation("Starting invitation cleanup...");

            int deletedCount = await invitationRepository.DeleteInactive(stoppingToken);

            if (deletedCount > 0) {
                LogDeletedCountInvitations(deletedCount);
            }
        } catch (Exception ex) {
            // Log the error but DO NOT throw, otherwise the entire BackgroundService will crash and stop running
            logger.LogError(ex, "Error occurred while cleaning up invitations.");
        }
    }
    
    [LoggerMessage(LogLevel.Information, "Deleted {Count} inactive/expired invitations.")]
    partial void LogDeletedCountInvitations(int count);
}