namespace Conflux.Application.Dto.Responses;

public record DiscoverFriendsResponse(
    List<DiscoverFriendElement> Users,
    int TotalCount
);