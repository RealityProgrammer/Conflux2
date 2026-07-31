using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Services;

public interface IChannelService {
    Task<Result<ChannelResolutionResult>> GetOrCreateDirectMessageChannelAsync(Guid user1, Guid user2);
}