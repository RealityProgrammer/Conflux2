using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Servers;

public sealed record GetServerMemberAuthorizeInfoQuery(Guid ServerId, Guid UserId) : IQuery<Result<ServerMemberAuthorizeInfoDto>>;

public sealed class GetServerMemberAuthorizeInfoHandler(
    IServerPermissionsProvider permissionsProvider
) : IQueryHandler<GetServerMemberAuthorizeInfoQuery, Result<ServerMemberAuthorizeInfoDto>> {
    public async ValueTask<Result<ServerMemberAuthorizeInfoDto>> Handle(
        GetServerMemberAuthorizeInfoQuery query, 
        CancellationToken cancellationToken
    ) {
        return await permissionsProvider.GetUserAuthorizeInfo(query.ServerId, query.UserId, cancellationToken);
    }
}