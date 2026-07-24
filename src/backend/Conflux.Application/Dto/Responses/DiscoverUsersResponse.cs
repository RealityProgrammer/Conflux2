namespace Conflux.Application.Dto.Responses;

public record DiscoverUsersResponse(
    List<DiscoverUserElement> Users,
    int TotalCount
);