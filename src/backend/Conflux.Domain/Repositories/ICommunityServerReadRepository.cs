using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface ICommunityServerReadRepository : IReadRepository<CommunityServer> {
    Task<bool> Exists(Guid id, CancellationToken cancellationToken = default);
}