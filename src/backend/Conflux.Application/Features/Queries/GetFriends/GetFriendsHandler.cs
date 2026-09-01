using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Queries.GetFriends;

public sealed class GetFriendsHandler(
    IFriendRequestRepository friendRequestRepository
) : IQueryHandler<GetFriendsQuery, PaginatedResult<UserIdentityProfileDto>> {
    public async ValueTask<PaginatedResult<UserIdentityProfileDto>> Handle(
        GetFriendsQuery query, 
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