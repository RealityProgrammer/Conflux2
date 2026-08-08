namespace Conflux.WebApi;

public sealed record IdempotentResponse(ApiResponse ApiResponse, int StatusCode);