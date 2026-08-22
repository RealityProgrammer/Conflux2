using Conflux.Domain.Dto;

namespace Conflux.Application.Queries;

public sealed record DiscoverFriendsQuery(
    Guid SearchingUserId,
    string? NameFilter, 
    int Offset, 
    int Count
) : IQuery<PaginatedResult<DiscoverFriendSummary>>;