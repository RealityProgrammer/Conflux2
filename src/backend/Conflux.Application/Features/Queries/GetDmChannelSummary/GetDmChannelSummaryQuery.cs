using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Features.Queries.GetDmChannelSummary;

public sealed record GetDmChannelSummaryQuery(
    Guid UserId, 
    Guid ChannelId
) : IQuery<Result<DmChannelSummary>>;