namespace Conflux.Domain.Dto;

public sealed record InfiniteDataResult<T>(List<T> Items, bool HasMore);