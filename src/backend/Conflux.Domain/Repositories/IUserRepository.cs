using Conflux.Domain.Dto;
using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IUserRepository {
    Task<ApplicationUser?> GetUserByEmailAsync(string email);
    Task<ApplicationUser?> GetUserByIdAsync(string userId);

    Task<bool> UpdateAvatarStatusAsync(Guid userId, bool hasAvatar, CancellationToken cancellationToken = default);
    Task<Result<bool>> IsProfileSetupAsync(Guid userId, CancellationToken cancellationToken = default);
    
    Task<Result> SetupProfileAsync(
        Guid userId, 
        string userName, 
        string displayName, 
        CancellationToken cancellationToken = default
    );

    Task<Result<UserProfileDto>> GetProfileAsync(
        Guid userId, 
        UserProfileQueryFlags queryFlags,
        CancellationToken cancellationToken = default
    );
    
    Task<List<UserProfileDto>> GetProfilesAsync(
        IReadOnlyCollection<Guid> userIds, 
        UserProfileQueryFlags queryFlags,
        CancellationToken cancellationToken = default
    );
    
    Task<Result<UserIdentityProfileDto>> GetIdentityProfileAsync(
        Guid userId, 
        CancellationToken cancellationToken = default
    );
    
    Task<List<UserIdentityProfileDto>> GetIdentityProfilesAsync(
        IReadOnlyCollection<Guid> userIds, 
        CancellationToken cancellationToken = default
    );
}