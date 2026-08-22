using Conflux.Application.Queries;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class PendingFriendRequestsQueryHandler(
    IFriendRequestRepository friendRequestRepository
) : IQueryHandler<PendingFriendRequestsQuery, PaginatedResult<PendingFriendRequestDto>> {
    public async ValueTask<PaginatedResult<PendingFriendRequestDto>> Handle(
        PendingFriendRequestsQuery query, 
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