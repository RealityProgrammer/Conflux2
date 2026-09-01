using Conflux.Domain.Dto;

namespace Conflux.Application.Features.Queries.DiscoverFriends;

public sealed record DiscoverFriendsQuery(
    Guid SearchingUserId,
    string? NameFilter, 
    int Offset, 
    int Count
) : IQuery<PaginatedResult<DiscoverFriendSummary>>;