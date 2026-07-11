using Conflux.Application.Responses;

namespace Conflux.Application.Services;

public interface IAuthenticateService {
    Task<Result> Register(string email, string password);
    Task<Result<LoginResponse>> Login(string email, string password);
    Task<Result<RefreshResponse>> Refresh(string userEmail, string refreshToken);
}