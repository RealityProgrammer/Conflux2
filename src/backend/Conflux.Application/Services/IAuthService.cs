using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IAuthService {
    Task<Result> Register(string email, string password);
    Task<Result<LoginResponse>> Login(string email, string password);
    Task<Result<RefreshResponse>> Refresh(string userEmail, string refreshToken);
    
    Task<Result<UserAuthorizationInfo?>> GetAuthorizationInfo(string userId);

    Task<Result> SendVerificationEmail(string userId);
    Task<Result> ConfirmEmail(string userId, string code);
}