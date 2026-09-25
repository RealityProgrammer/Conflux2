using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;

namespace Conflux.Domain.Repositories;

public interface IUserRepository : IRepository<ApplicationUser> {
    Task<bool> UpdateAvatarRevision(Guid userId, int? revision, CancellationToken cancellationToken = default);
    Task<Result<bool>> IsProfileSetup(Guid userId, CancellationToken cancellationToken = default);
    
    Task<Result<UserIdentityProfileDto>> GetIdentityProfile(
        Guid userId, 
        CancellationToken cancellationToken = default
    );
    
    Task<List<UserIdentityProfileDto>> GetIdentityProfiles(
        IReadOnlyCollection<Guid> userIds, 
        CancellationToken cancellationToken = default
    );

    Task<Result<PresenceStatus>> GetManualPresenceStatus(Guid userId, CancellationToken cancellationToken = default);
}