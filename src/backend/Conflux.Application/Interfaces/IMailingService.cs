using Conflux.Domain;

namespace Conflux.Application.Interfaces;

public interface IMailingService {
    Task<Result> SendEmailConfirmationAsync(string receiverEmail, string verifyUrl);
}