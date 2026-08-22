using Conflux.Application.Queries;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class FriendsQueryHandler(
    IFriendRequestRepository friendRequestRepository
) : IQueryHandler<FriendsQuery, PaginatedResult<UserIdentityProfileDto>> {
    public async ValueTask<PaginatedResult<UserIdentityProfileDto>> Handle(
        FriendsQuery query, 
        CancellationToken cancellationToken
    ) {
        return await friendRequestRepository.GetFriends(
            query.UserId, 
            query.NameFilter, 
            query.Offset,
            query.Count,
            cancellationToken
        );
    }
}