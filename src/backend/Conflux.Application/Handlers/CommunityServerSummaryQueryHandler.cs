using Conflux.Application.Commands;
using Conflux.Application.Queries;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class CommunityServerSummaryQueryHandler(
    ICommunityServerRepository repository
) : IQueryHandler<CommunityServerSummaryQuery, Result<CommunityServerSummaryDto>> {
    public async ValueTask<Result<CommunityServerSummaryDto>> Handle(CommunityServerSummaryQuery request, CancellationToken cancellationToken) {
        Result<CommunityServerProfileDto> profileResult =
            await repository.GetProfile(request.ServerId, cancellationToken);

        if (!profileResult.IsSuccess) {
            return profileResult.Error;
        }

        var profile = profileResult.Value!;
        List<ChannelCategorySummaryDto> categories = await GetChannelCategorySummaries(request.ServerId, cancellationToken);

        return Result<CommunityServerSummaryDto>.Success(
            new(profile.Name, profile.Description, profile.HasAvatar, categories)
        );
    }

    private async Task<List<ChannelCategorySummaryDto>> GetChannelCategorySummaries(
        Guid serverId, 
        CancellationToken cancellationToken = default
    ) {
        List<ChannelCategorySummaryDto> result = 
            await repository.GetChannelCategorySummaries(serverId, cancellationToken);

        // TODO: Caching.
        
        return result;
    }
}