using Conflux.Domain.Dto;

namespace Conflux.Application.Queries;

public sealed record PendingFriendRequestsQuery(
    Guid UserId,
    string? NameFilter,
    int Offset,
    int Count
) : IQuery<PaginatedResult<PendingFriendRequestDto>>;