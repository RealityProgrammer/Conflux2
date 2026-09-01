using Conflux.Domain.Dto;

namespace Conflux.Application.Features.Queries.GetFriends;

public sealed record GetFriendsQuery(
    Guid UserId,
    string? NameFilter,
    int Offset,
    int Count
) : IQuery<PaginatedResult<UserIdentityProfileDto>>;