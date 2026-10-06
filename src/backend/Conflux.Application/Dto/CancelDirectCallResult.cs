namespace Conflux.Application.Dto;

public sealed record CancelDirectCallResult(Guid CallId, Guid CalleeId);