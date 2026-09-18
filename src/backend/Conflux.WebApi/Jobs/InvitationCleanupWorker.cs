using Conflux.Domain.Repositories;

namespace Conflux.WebApi.Jobs;

internal sealed partial class InvitationCleanupWorker : BackgroundService {
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<InvitationCleanupWorker> _logger;

    public InvitationCleanupWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<InvitationCleanupWorker> logger
    ) {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        _logger.LogInformation("Started.");

        // clean the database once every hour
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));

        try {
            while (await timer.WaitForNextTickAsync(stoppingToken)) {
                await PerformCleanupAsync(stoppingToken);
            }
        } catch (OperationCanceledException) {
            _logger.LogInformation("Stopping...");
        }
    }

    private async Task PerformCleanupAsync(CancellationToken stoppingToken) {
        using var scope = _scopeFactory.CreateScope();

        var invitationRepository = scope.ServiceProvider.GetRequiredService<IInvitationRepository>();

        try {
            _logger.LogInformation("Starting invitation cleanup...");

            int deletedCount = await invitationRepository.DeleteInactive(stoppingToken);

            if (deletedCount > 0) {
                LogDeletedCountInvitations(deletedCount);
            }
        } catch (Exception ex) {
            // Log the error but DO NOT throw, otherwise the entire BackgroundService will crash and stop running
            _logger.LogError(ex, "Error occurred while cleaning up invitations.");
        }
    }
    
    [LoggerMessage(LogLevel.Information, "Deleted {Count} inactive/expired invitations.")]
    partial void LogDeletedCountInvitations(int count);
}