using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record GetServerDetailsQuery(Guid ServerId, Guid UserId) : IQuery<Result<ServerDetailsDto>>;

public sealed class GetServerDetailsHandler(
    ICommunityServerRepository repository,
    IServerPermissionsProvider permissionsProvider
) : IQueryHandler<GetServerDetailsQuery, Result<ServerDetailsDto>> {
    public async ValueTask<Result<ServerDetailsDto>> Handle(
        GetServerDetailsQuery query, 
        CancellationToken cancellationToken
    ) {
        var serverId = query.ServerId;
        
        var userAuthorizeResult = await permissionsProvider.GetUserAuthorizeInfo(serverId, query.UserId, cancellationToken);
        if (!userAuthorizeResult.IsSuccess) {
            return userAuthorizeResult.Error;
        }
        
        var serverInfo = await repository
            .AsQueryable()
            .Where(s => s.Id == serverId)
            .Select(s => new {
                s.Id,
                s.Name,
                s.HasAvatar,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (serverInfo == null) {
            return Errors.ResourceNotFound("Server", [
                new(nameof(CommunityServer.Id), serverId.ToString()),
            ]);
        }

        var categoryStructure = await repository.GetChannelCategoryStructure(serverId, cancellationToken);

        return Result<ServerDetailsDto>.Success(new(serverInfo.Id, serverInfo.Name, serverInfo.HasAvatar, categoryStructure, userAuthorizeResult.Value!));
    }
}