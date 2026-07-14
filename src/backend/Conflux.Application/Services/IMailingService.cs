namespace Conflux.Application.Services;

public interface IMailingService {
    Task<Result> SendEmailConfirmationAsync(string receiverEmail, string verifyUrl);
}