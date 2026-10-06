namespace Conflux.Application.Dto;

public sealed record DropCallResult(Guid CallId, List<Guid> RemainingParticipants);