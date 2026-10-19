using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Friends;

public sealed record DiscoverFriendsQuery(
    string? NameFilter, 
    int Offset, 
    int Count
) : IQuery<Result<PaginatedResult<DiscoverFriendSummary>>>;

public sealed class DiscoverFriendsHandler(
    ICurrentUserService currentUserService,
    IFriendRequestRepository friendRequestRepository
) : IQueryHandler<DiscoverFriendsQuery, Result<PaginatedResult<DiscoverFriendSummary>>> {
    public async ValueTask<Result<PaginatedResult<DiscoverFriendSummary>>> Handle(
        DiscoverFriendsQuery query, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        var result = await friendRequestRepository.GetFriendDiscovery(
            userId,
            query.NameFilter, 
            query.Offset, 
            query.Count,
            cancellationToken
        );
        
        return Result<PaginatedResult<DiscoverFriendSummary>>.Success(result);
    }
}