using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;

namespace Conflux.Application.Features.Queries.GetUserServerPermissions;

public sealed class GetUserServerPermissionsHandler(
    IServerPermissionsProvider provider
) : IQueryHandler<GetUserServerPermissionsQuery, Result<ServerMemberPermissionsDto>> {
    public async ValueTask<Result<ServerMemberPermissionsDto>> Handle(
        GetUserServerPermissionsQuery query, 
        CancellationToken cancellationToken
    ) {
        return await provider.GetUserPermissions(query.CommunityServerId, query.UserId, cancellationToken);
    }
}