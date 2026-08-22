using Conflux.Application.Queries;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class DmChannelSummaryQueryHandler(
    IChannelRepository channelRepository
) : IQueryHandler<DmChannelSummaryQuery, Result<DmChannelSummary>> {
    public async ValueTask<Result<DmChannelSummary>> Handle(DmChannelSummaryQuery query, CancellationToken cancellationToken) {
        return await channelRepository.GetDmChannelSummary(query.UserId, query.ChannelId);
    }
}