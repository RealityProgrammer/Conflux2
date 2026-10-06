namespace Conflux.Application.Dto;

public sealed record EndDirectCallResult(Guid PeerId, TimeSpan CallDuration);