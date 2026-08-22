using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Services.Implementations;

internal sealed class FriendService(
    IFriendRequestRepository friendRequestRepository
) : IFriendService {
    public async Task<Result<PaginatedResult<DiscoverFriendSummary>>> DiscoverFriends(
        Guid searchingUserId,
        string? nameFilter, 
        int offset, 
        int count
    ) {
        var result = await friendRequestRepository.GetFriendDiscovery(
            searchingUserId, 
            nameFilter, 
            offset, 
            count
        );
        
        return Result<PaginatedResult<DiscoverFriendSummary>>.Success(result);
    }
}