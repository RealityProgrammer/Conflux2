namespace Conflux.Domain.Dto;

public sealed record PaginatedResult<T>(List<T> Elements, int TotalCount);