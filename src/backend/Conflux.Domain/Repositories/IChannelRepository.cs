using Conflux.Domain.Dto;

namespace Conflux.Domain.Repositories;

public interface IChannelRepository {
    Task<Result<ChannelResolutionResult>> GetOrCreateDirectMessageChannelAsync(Guid user1, Guid user2);
}