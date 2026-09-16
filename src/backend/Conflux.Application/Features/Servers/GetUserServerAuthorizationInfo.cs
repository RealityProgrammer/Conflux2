using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;

namespace Conflux.Application.Features.Servers;

public sealed record GetUserServerAuthorizationInfoQuery(
    Guid CommunityServerId,
    Guid UserId
) : IQuery<Result<ServerMemberAuthorizeInfoDto>>;

public sealed class GetUserServerAuthorizationInfoHandler(
    IServerPermissionsProvider provider
) : IQueryHandler<GetUserServerAuthorizationInfoQuery, Result<ServerMemberAuthorizeInfoDto>> {
    public async ValueTask<Result<ServerMemberAuthorizeInfoDto>> Handle(
        GetUserServerAuthorizationInfoQuery query, 
        CancellationToken cancellationToken
    ) {
        return await provider.GetUserAuthorizeInfo(query.CommunityServerId, query.UserId, cancellationToken);
    }
}