using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Friends;

public sealed record GetFriendsQuery(
    Guid UserId,
    string? NameFilter,
    int Offset,
    int Count
) : IQuery<PaginatedResult<UserIdentityProfileDto>>;

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