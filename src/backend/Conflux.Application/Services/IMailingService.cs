using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IMailingService {
    Task<Result> SendEmailConfirmation(string receiverEmail, string verifyUrl);
}