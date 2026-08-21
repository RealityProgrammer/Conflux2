using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IAuthService {
    Task<Result<UserAuthorizationInfo?>> GetAuthorizationInfo(string userId);
}