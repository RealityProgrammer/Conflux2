using Conflux.Application.Dto.Responses;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IAuthService {
    Task<Result> RegisterAsync(string email, string password);
    Task<Result<LoginResponse>> LoginAsync(string email, string password);
    Task<Result<RefreshResponse>> RefreshAsync(string userEmail, string refreshToken);
    
    Task<Result<UserAuthorizationInfo?>> GetAuthorizationInfoAsync(string userId);

    Task<Result> SendVerificationEmailAsync(string userId);
    Task<Result> ConfirmEmailAsync(string userId, string code);
}