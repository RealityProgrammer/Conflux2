using Conflux.Domain;
using Conflux.Domain.Entities;

namespace Conflux.Application.Services;

public interface IJwtStorage {
    Task<Result> StoresAuthenticationToken(ApplicationUser user, byte[] token, DateTimeOffset expiration);
    Task<Result> CheckAuthenticationToken(ApplicationUser user, byte[] token);
}