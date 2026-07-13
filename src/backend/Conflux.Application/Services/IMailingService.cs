namespace Conflux.Application.Services;

public interface IMailingService {
    Task<Result> SendEmailConfirmationAsync(string receiver, string destination);
}