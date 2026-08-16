using Conflux.Domain;

namespace Conflux.Application.Services;

public interface ICommunityServerService {
    Task<Result> Create(Guid creatorId, string name, Stream? avatarStream, CancellationToken cancellationToken = default);
}