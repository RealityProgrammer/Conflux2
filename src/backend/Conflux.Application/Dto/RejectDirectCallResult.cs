namespace Conflux.Application.Dto;

public sealed record RejectDirectCallResult(Guid CallId, Guid CallerId);