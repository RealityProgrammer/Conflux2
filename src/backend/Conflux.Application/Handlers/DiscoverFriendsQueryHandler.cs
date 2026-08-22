using Conflux.Application.Queries;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class DiscoverFriendsQueryHandler(
    IFriendRequestRepository friendRequestRepository
) : IQueryHandler<DiscoverFriendsQuery, PaginatedResult<DiscoverFriendSummary>> {
    public async ValueTask<PaginatedResult<DiscoverFriendSummary>> Handle(
        DiscoverFriendsQuery query, 
        CancellationToken cancellationToken
    ) {
        var result = await friendRequestRepository.GetFriendDiscovery(
            query.SearchingUserId, 
            query.NameFilter, 
            query.Offset, 
            query.Count,
            cancellationToken
        );
        
        return result;
    }
}