namespace Conflux.Application.Dto;

public sealed record EndDirectCallResult(Guid CallId, Guid PeerId, TimeSpan CallDuration);