using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed record GetServerDetailsQuery(Guid ServerId) : IQuery<Result<ServerDetailsDto>>;

public sealed class GetServerDetailsHandler(
    ICurrentUserService currentUserService,
    ICommunityServerWriteRepository repository,
    IServerPermissionsProvider permissionsProvider
) : IQueryHandler<GetServerDetailsQuery, Result<ServerDetailsDto>> {
    public async ValueTask<Result<ServerDetailsDto>> Handle(
        GetServerDetailsQuery query, 
        CancellationToken cancellationToken
    ) {
	if (currentUserService.UserId is not { } userId) {
	    return Errors.InvalidIdentifier();
	}

        var serverId = query.ServerId;
        
        var userAuthorizeResult = await permissionsProvider.GetUserAuthorizeInfo(serverId, userId, cancellationToken);
        if (!userAuthorizeResult.IsSuccess) {
            return userAuthorizeResult.Error;
        }
        
        var serverInfo = await repository
            .AsQueryable()
            .Where(s => s.Id == serverId)
            .Select(s => new {
                s.Id,
                s.Name,
                s.AvatarVersion,
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (serverInfo == null) {
            return Errors.ResourceNotFound("Server", [
                new(nameof(CommunityServer.Id), serverId.ToString()),
            ]);
        }

        var categoryStructure = await repository.GetChannelCategoryStructure(serverId, cancellationToken);

        return Result<ServerDetailsDto>.Success(new(serverInfo.Id, serverInfo.Name, serverInfo.AvatarVersion, categoryStructure, userAuthorizeResult.Value!));
    }
}
