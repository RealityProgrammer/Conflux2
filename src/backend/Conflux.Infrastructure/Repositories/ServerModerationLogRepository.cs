using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class ServerModerationLogRepository(
    ApplicationDbContext dbContext
) : IServerModerationLogReadRepository, IServerModerationLogWriteRepository {
    public void Add(ServerModerationLog value) {
        dbContext.ServerModerationLogs.Add(value);
    }

    public IQueryable<ServerModerationLog> AsQueryable() {
        return dbContext.ServerModerationLogs;
    }
}