using Conflux.Domain;
using Conflux.Domain.Entities;

namespace Conflux.Application.Services;

public interface IAuthMailService {
    Task<Result> SendConfirmationEmail(ApplicationUser user, CancellationToken cancellationToken = default);
    Task<Result> SendPasswordResetEmail(ApplicationUser user, CancellationToken cancellationToken = default);
}