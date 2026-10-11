using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Servers;

public sealed record GetServerChannelCategoriesQuery(
    Guid ServerId,
    Guid UserId
) : IQuery<Result<IReadOnlyCollection<ChannelCategoryDetailDto>>>;

public sealed class GetServerChannelCategoriesHandler(
    ICommunityServerRepository repository,
    IServerMemberReadRepository serverMemberReadRepository
) : IQueryHandler<GetServerChannelCategoriesQuery, Result<IReadOnlyCollection<ChannelCategoryDetailDto>>> {
    public async ValueTask<Result<IReadOnlyCollection<ChannelCategoryDetailDto>>> Handle(
        GetServerChannelCategoriesQuery query, 
        CancellationToken cancellationToken
    ) {
        if (!await serverMemberReadRepository.IsUserJoined(query.UserId, query.ServerId, cancellationToken)) {
            return Errors.ResourceNotFound("Server", [
                new(nameof(CommunityServer.Id), query.ServerId.ToString()),
            ]);
        }
        
        var categoryStructure = await repository.GetChannelCategoryStructure(query.ServerId, cancellationToken);
        return Result<IReadOnlyCollection<ChannelCategoryDetailDto>>.Success(categoryStructure);
    }
}