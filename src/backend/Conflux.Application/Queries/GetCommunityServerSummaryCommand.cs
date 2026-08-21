using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Queries;

public sealed record GetCommunityServerSummaryCommand(Guid ServerId) : IQuery<Result<CommunityServerSummaryDto>>;