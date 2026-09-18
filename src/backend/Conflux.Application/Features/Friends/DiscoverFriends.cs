using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Friends;

public sealed record DiscoverFriendsQuery(
    Guid SearchingUserId,
    string? NameFilter, 
    int Offset, 
    int Count
) : IQuery<PaginatedResult<DiscoverFriendSummary>>;

public sealed class DiscoverFriendsHandler(
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