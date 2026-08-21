using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Queries;

public sealed record CommunityServerSummaryQuery(Guid ServerId) : IQuery<Result<CommunityServerSummaryDto>>;