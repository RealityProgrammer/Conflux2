using Conflux.Domain.Dto;

namespace Conflux.Application.Queries;

public sealed record FriendsQuery(
    Guid UserId,
    string? NameFilter,
    int Offset,
    int Count
) : IQuery<PaginatedResult<UserIdentityProfileDto>>;