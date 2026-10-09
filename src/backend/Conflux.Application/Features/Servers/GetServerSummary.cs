using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Servers;

public sealed record GetServerSummaryQuery(Guid ServerId) : IQuery<Result<ServerSummaryDto>>;

public sealed class GetServerSummaryHandler(
    ICommunityServerRepository repository
) : IQueryHandler<GetServerSummaryQuery, Result<ServerSummaryDto>> {
    public async ValueTask<Result<ServerSummaryDto>> Handle(
        GetServerSummaryQuery query, 
        CancellationToken cancellationToken
    ) {
        Result<CommunityServerProfileDto> profileResult =
            await repository.GetProfile(query.ServerId, cancellationToken);

        if (!profileResult.IsSuccess) {
            return profileResult.Error;
        }

        var profile = profileResult.Value!;
        List<ChannelCategoryDetailDto> categories = await GetChannelCategorySummaries(query.ServerId, cancellationToken);

        return Result<ServerSummaryDto>.Success(
            new(profile.Name, profile.Description, profile.HasAvatar, categories)
        );
    }

    private async Task<List<ChannelCategoryDetailDto>> GetChannelCategorySummaries(
        Guid serverId, 
        CancellationToken cancellationToken = default
    ) {
        List<ChannelCategoryDetailDto> result = 
            await repository.GetChannelCategorySummaries(serverId, cancellationToken);

        // TODO: Caching.
        
        return result;
    }
}