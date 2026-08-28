using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Queries;

public sealed record GetUserPermissionsForServer(
    Guid CommunityServerId,
    Guid UserId
) : IQuery<Result<ServerMemberPermissionsDto>>;