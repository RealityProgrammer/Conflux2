using Conflux.Domain.Dto;

namespace Conflux.Application.Dto;

public sealed record GetIncomingDirectCallResult(Guid CallId, Guid CallerId);
public sealed record GetIncomingDirectCallQueryResult(Guid CallId, UserIdentityProfileDto CallerProfile);