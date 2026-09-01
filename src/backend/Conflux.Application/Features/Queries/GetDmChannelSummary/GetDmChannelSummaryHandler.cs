using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Queries.GetDmChannelSummary;

public sealed class GetDmChannelSummaryHandler(
    IChannelRepository channelRepository
) : IQueryHandler<GetDmChannelSummaryQuery, Result<DmChannelSummary>> {
    public async ValueTask<Result<DmChannelSummary>> Handle(GetDmChannelSummaryQuery query, CancellationToken cancellationToken) {
        return await channelRepository.GetDmChannelSummary(query.UserId, query.ChannelId);
    }
}