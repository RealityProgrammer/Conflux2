using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Features.Queries.GetUserServerPermissions;

public sealed record GetUserServerPermissionsQuery(
    Guid CommunityServerId,
    Guid UserId
) : IQuery<Result<ServerMemberPermissionsDto>>;