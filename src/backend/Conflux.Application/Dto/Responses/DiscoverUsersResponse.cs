namespace Conflux.Application.Dto.Responses;

public record DiscoverUsersResponse(
    List<UserSearchResult> Users,
    int TotalCount
);