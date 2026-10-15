using Conflux.Application.Services;

namespace Conflux.WebApi.Jobs;

internal sealed class EmailBackgroundWorker(
    IEmailQueue emailQueue,
    IMailService mailService,
    ILogger<EmailBackgroundWorker> logger
) : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        logger.LogInformation("Started.");

        while (!stoppingToken.IsCancellationRequested) {
            try {
                var emailMessage = await emailQueue.Dequeue(stoppingToken);

                await mailService.SendHtmlEmailAsync(emailMessage.ToEmail, emailMessage.Subject, emailMessage.Body, stoppingToken);
            } catch (Exception ex) when (ex is not OperationCanceledException) {
                logger.LogError(ex, "Error occurred while processing email queue.");
            }
        }
    }
}