namespace Conflux.Application.Services;

public sealed record EmailMessage(string ToEmail, string Subject, string Body);

public interface IEmailQueue {
    ValueTask QueueEmail(EmailMessage message);
    ValueTask<EmailMessage> Dequeue(CancellationToken cancellationToken);
}