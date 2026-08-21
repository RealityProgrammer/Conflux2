using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Queries;

public sealed record DmChannelSummaryQuery(
    Guid UserId, 
    Guid ChannelId
) : IQuery<Result<DmChannelSummary>>;