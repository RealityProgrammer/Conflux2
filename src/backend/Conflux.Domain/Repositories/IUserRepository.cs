using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IUserRepository : IRepository<ApplicationUser> {
    Task<bool> UpdateAvatarStatus(Guid userId, bool hasAvatar, CancellationToken cancellationToken = default);
    Task<Result<bool>> IsProfileSetup(Guid userId, CancellationToken cancellationToken = default);
    
    Task<Result> SetupProfile(
        Guid userId, 
        string userName, 
        string displayName, 
        CancellationToken cancellationToken = default
    );
    
    Task<Result<UserIdentityProfileDto>> GetIdentityProfile(
        Guid userId, 
        CancellationToken cancellationToken = default
    );
    
    Task<List<UserIdentityProfileDto>> GetIdentityProfiles(
        IReadOnlyCollection<Guid> userIds, 
        CancellationToken cancellationToken = default
    );
}