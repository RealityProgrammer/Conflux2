namespace Conflux.Domain.Repositories;

public interface IAuthRepository {
    Task<Result<ApplicationUser>> RegisterAsync(string email, string password);
    Task<ApplicationUser?> GetUserByLoginCredentialAsync(string email, string password);
    
    Task<string> GenerateEmailConfirmationCodeAsync(ApplicationUser user);
    Task<Result> ConfirmEmailAsync(ApplicationUser user, string token);

    Task<IList<string>> GetUserRolesAsync(ApplicationUser user);

    Task<Result> StoresAuthenticationToken(ApplicationUser user, string token, DateTimeOffset expiration);
    Task<Result> CheckAuthenticationToken(ApplicationUser user, string token);
}