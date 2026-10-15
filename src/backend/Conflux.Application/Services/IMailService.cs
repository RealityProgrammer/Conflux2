using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IMailService {
    Task<Result> SendHtmlEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken cancellationToken = default);
}