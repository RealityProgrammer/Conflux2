using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Commands;

public sealed record GetCommunityServerSummaryCommand(Guid ServerId) : IRequest<Result<CommunityServerSummaryDto>>;