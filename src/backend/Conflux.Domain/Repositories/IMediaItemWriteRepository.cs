using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IMediaItemWriteRepository : IWriteRepository<MediaItem> {
    Task<bool> Delete(Guid id, CancellationToken cancellationToken = default);
    Task<int?> Update(Guid id, string contentType, CancellationToken cancellationToken = default);
}