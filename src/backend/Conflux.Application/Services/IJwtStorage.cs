using Conflux.Domain;
using Conflux.Domain.Entities;

namespace Conflux.Application.Services;

public interface IJwtStorage {
    Task<Result> StoresAuthenticationToken(ApplicationUser user, string token, DateTimeOffset expiration);
    Task<Result> CheckAuthenticationToken(ApplicationUser user, string token);
}