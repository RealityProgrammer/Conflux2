using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Services;

public interface ICommunityServerReadRepository : IReadRepository<CommunityServer> {
    Task<bool> Exists(Guid id, CancellationToken cancellationToken = default);
}