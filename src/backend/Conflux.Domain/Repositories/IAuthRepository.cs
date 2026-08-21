using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IAuthRepository {
    Task<ApplicationUser?> GetUserByLoginCredential(string email, string password);
    
    Task<string> GenerateEmailConfirmationCode(ApplicationUser user);
    Task<Result> ConfirmEmail(ApplicationUser user, string token);

    Task<IList<string>> GetUserRoles(ApplicationUser user);

    Task<Result> StoresAuthenticationToken(ApplicationUser user, string token, DateTimeOffset expiration);
    Task<Result> CheckAuthenticationToken(ApplicationUser user, string token);
}