using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Services;

public interface ICommunityServerService {
    Task<Result> Create(Guid creatorId, string name, Stream? avatarStream, CancellationToken cancellationToken = default);

    Task<Result<CommunityServerSummaryDto>> GetSummary(Guid serverId, CancellationToken cancellationToken = default);
    
    string GetAvatarUrl(Guid serverId);
}