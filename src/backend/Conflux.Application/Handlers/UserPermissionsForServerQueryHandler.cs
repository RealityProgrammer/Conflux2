using Conflux.Application.Dto;
using Conflux.Application.Queries;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.Extensions.Caching.Distributed;
using System.Collections.Frozen;
using System.Text.Json;

namespace Conflux.Application.Handlers;

public sealed class UserPermissionsForServerQueryHandler(
    IServerPermissionsProvider provider
) : IQueryHandler<GetUserPermissionsForServer, Result<ServerMemberPermissionsDto>> {
    public async ValueTask<Result<ServerMemberPermissionsDto>> Handle(
        GetUserPermissionsForServer query, 
        CancellationToken cancellationToken
    ) {
        return await provider.GetUserPermissions(query.CommunityServerId, query.UserId, cancellationToken);
    }
}