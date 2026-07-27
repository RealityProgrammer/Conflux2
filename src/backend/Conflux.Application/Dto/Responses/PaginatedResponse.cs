namespace Conflux.Application.Dto.Responses;

public record PaginatedResponse<T>(List<T> Elements, int TotalCount);