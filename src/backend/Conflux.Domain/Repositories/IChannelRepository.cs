using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IChannelRepository : IWriteRepository<Channel>, IReadRepository<Channel> {
    Task<Result<ChannelMetadataDto>> GetChannelMetadataFromChannelId(
        Guid channelId, 
        CancellationToken cancellationToken = default
    );
    
    Task<bool> Delete(Guid serverId, Guid channelId, CancellationToken cancellationToken = default);
}