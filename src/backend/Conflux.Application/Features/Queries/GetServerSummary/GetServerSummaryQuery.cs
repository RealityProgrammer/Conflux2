using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Features.Queries.GetServerSummary;

public sealed record GetServerSummaryQuery(Guid ServerId) : IQuery<Result<CommunityServerSummaryDto>>;