using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;

namespace Conflux.Application.Features.Servers;

public sealed record GetUserServerAuthorizationInfoQuery(
    Guid CommunityServerId,
    Guid UserId
) : IQuery<Result<ServerMemberAuthorizationInfoDto>>;

public sealed class GetUserServerAuthorizationInfoHandler(
    IServerPermissionsProvider provider
) : IQueryHandler<GetUserServerAuthorizationInfoQuery, Result<ServerMemberAuthorizationInfoDto>> {
    public async ValueTask<Result<ServerMemberAuthorizationInfoDto>> Handle(
        GetUserServerAuthorizationInfoQuery query, 
        CancellationToken cancellationToken
    ) {
        return await provider.GetUserPermissions(query.CommunityServerId, query.UserId, cancellationToken);
    }
}