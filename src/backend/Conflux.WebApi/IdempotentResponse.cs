namespace Conflux.WebApi;

public sealed record IdempotentResponse(string JsonBody, int StatusCode);