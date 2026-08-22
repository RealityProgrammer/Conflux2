using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Services;

public interface IFriendService {
    Task<Result<PaginatedResult<DiscoverFriendSummary>>> DiscoverFriends(
        Guid searchingUserId,
        string? nameFilter, 
        int offset, 
        int count
    );
}