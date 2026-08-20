using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;

namespace Conflux.Application.Services;

public interface ICommunityServerService {
    Task<Result> Create(Guid creatorId, string name, Stream? avatarStream, CancellationToken cancellationToken = default);

    Task<Result<CommunityServerSummaryDto>> GetSummary(Guid serverId, CancellationToken cancellationToken = default);
    
    Task<Result<Guid>> CreateChannelCategory(Guid userId, Guid serverId, string name, CancellationToken cancellationToken = default);
    Task<Result<Guid>> CreateChannel(Guid userId, Guid serverId, string name, ChannelType type, Guid? categoryId, CancellationToken cancellationToken = default);
    
    Task<Result> DeleteChannelCategory(Guid userId, Guid serverId, Guid categoryId, CancellationToken cancellationToken = default);
    Task<Result> DeleteChannel(Guid userId, Guid serverId, Guid channelId, CancellationToken cancellationToken = default);
    
    string GetAvatarUrl(Guid serverId);
}