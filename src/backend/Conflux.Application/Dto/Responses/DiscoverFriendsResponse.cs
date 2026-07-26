namespace Conflux.Application.Dto.Responses;

public sealed record DiscoverFriendsResponse(
    List<DiscoverFriendElement> Users,
    int TotalCount
);