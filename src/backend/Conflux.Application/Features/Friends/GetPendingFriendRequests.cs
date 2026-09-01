using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Friends;

public sealed record GetPendingFriendRequestsQuery(
    Guid UserId,
    string? NameFilter,
    int Offset,
    int Count
) : IQuery<PaginatedResult<PendingFriendRequestDto>>;

public sealed class GetPendingFriendRequestsHandler(
    IFriendRequestRepository friendRequestRepository
) : IQueryHandler<GetPendingFriendRequestsQuery, PaginatedResult<PendingFriendRequestDto>> {
    public async ValueTask<PaginatedResult<PendingFriendRequestDto>> Handle(
        GetPendingFriendRequestsQuery query, 
        CancellationToken cancellationToken
    ) {
        return await friendRequestRepository.GetPendingRequests(
            query.UserId, 
            query.NameFilter, 
            query.Offset,
            query.Count,
            cancellationToken
        );
    }
}