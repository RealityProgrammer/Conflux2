namespace Conflux.WebApi;

public readonly record struct IdempotencyResult<T>(bool IsProcessed, T Result);