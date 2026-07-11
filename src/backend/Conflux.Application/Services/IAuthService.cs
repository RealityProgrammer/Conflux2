using Conflux.Application.Responses;

namespace Conflux.Application.Services;

public interface IAuthService {
    Task<Result> RegisterAsync(string email, string password);
    Task<Result<LoginResponse>> LoginAsync(string email, string password);
    Task<Result<RefreshResponse>> RefreshAsync(string userEmail, string refreshToken);
    
    Task<UserAuthorizationInfo?> GetAuthorizationInfoAsync(Guid userId);
    Task<UserAuthorizationInfo?> GetAuthorizationInfoAsync(string userId);
}