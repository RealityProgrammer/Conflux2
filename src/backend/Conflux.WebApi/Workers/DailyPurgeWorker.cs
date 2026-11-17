using Conflux.Application.Features.Conversation;
using Conflux.Application.Features.Notifications;
using Conflux.Application.Features.Servers;
using Conflux.Application.Features.Users;
using Conflux.Application.Services;
using Conflux.Domain.Repositories;
using Mediator;

namespace Conflux.WebApi.Workers;

internal sealed class DailyPurgeWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<DailyPurgeWorker> logger
) : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        logger.LogInformation("Started.");
        
        // initial prune
        await PurgeStuffs(stoppingToken);

        using var timer = new PeriodicTimer(TimeSpan.FromHours(24));

        try {
            while (await timer.WaitForNextTickAsync(stoppingToken)) {
                logger.LogInformation("Begin daily purging...");
                
                try {
                    await PurgeStuffs(stoppingToken);
                } catch (OperationCanceledException) {
                    throw;
                } catch (Exception e) {
                    logger.LogError(e, "Exception thrown while doing daily purging.");
                }
            }
        } catch (OperationCanceledException) {
            logger.LogInformation("Stopping...");
        }
    }

    private async Task PurgeStuffs(CancellationToken cancellationToken) {
        using var scope = scopeFactory.CreateScope();

        var sender = scope.ServiceProvider.GetRequiredService<ISender>();

        await sender.Send(new PruneInactivateInvitationsCommand(), cancellationToken);
        await sender.Send(new PruneDeletedMessagesCommand(), cancellationToken);
        await sender.Send(new PruneRequestDeleteAccountsCommand(), cancellationToken);
        await sender.Send(new PruneReadMentionNotificationsCommand(), cancellationToken);
    }
}