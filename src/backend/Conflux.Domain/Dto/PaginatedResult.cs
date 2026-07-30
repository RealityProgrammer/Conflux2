namespace Conflux.Domain.Dto;

public record PaginatedResult<T>(List<T> Elements, int TotalCount);