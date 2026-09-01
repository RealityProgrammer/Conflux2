using Conflux.Domain.Dto;

namespace Conflux.Application.Features.Queries.GetPendingFriendRequests;

public sealed record GetPendingFriendRequestsQuery(
    Guid UserId,
    string? NameFilter,
    int Offset,
    int Count
) : IQuery<PaginatedResult<PendingFriendRequestDto>>;