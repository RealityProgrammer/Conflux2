using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Servers;

public sealed record GetServerSummaryQuery(Guid ServerId) : IQuery<Result<CommunityServerSummaryDto>>;

public sealed class GetServerSummaryHandler(
    ICommunityServerRepository repository
) : IQueryHandler<GetServerSummaryQuery, Result<CommunityServerSummaryDto>> {
    public async ValueTask<Result<CommunityServerSummaryDto>> Handle(
        GetServerSummaryQuery query, 
        CancellationToken cancellationToken
    ) {
        Result<CommunityServerProfileDto> profileResult =
            await repository.GetProfile(query.ServerId, cancellationToken);

        if (!profileResult.IsSuccess) {
            return profileResult.Error;
        }

        var profile = profileResult.Value!;
        List<ChannelCategoryIdentityDto> categories = await GetChannelCategorySummaries(query.ServerId, cancellationToken);

        return Result<CommunityServerSummaryDto>.Success(
            new(profile.Name, profile.Description, profile.HasAvatar, categories)
        );
    }

    private async Task<List<ChannelCategoryIdentityDto>> GetChannelCategorySummaries(
        Guid serverId, 
        CancellationToken cancellationToken = default
    ) {
        List<ChannelCategoryIdentityDto> result = 
            await repository.GetChannelCategorySummaries(serverId, cancellationToken);

        // TODO: Caching.
        
        return result;
    }
}