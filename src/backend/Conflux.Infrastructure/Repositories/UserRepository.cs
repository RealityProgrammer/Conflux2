using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Infrastructure.Repositories;

internal sealed class UserRepository(
    UserManager<ApplicationUser> userManager,
    ApplicationDbContext dbContext,
    TimeProvider timeProvider
) : IUserRepository {
    public async Task<ApplicationUser?> GetUserByEmailAsync(string email) {
        return await userManager.FindByEmailAsync(email);
    }
    
    public async Task<ApplicationUser?> GetUserByIdAsync(string email) {
        return await userManager.FindByIdAsync(email);
    }

    public async Task<bool> UpdateAvatarStatusAsync(
        Guid userId, 
        bool hasAvatar, 
        CancellationToken cancellationToken = default
    ) {
        DateTimeOffset utcNow = timeProvider.GetUtcNow();

        int numChange = await dbContext.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(builder => {
                builder.SetProperty(u => u.HasAvatar, hasAvatar);
                builder.SetProperty(u => u.AvatarUpdatedAt, utcNow);
            }, cancellationToken);

        return numChange > 0;
    }

    public async Task<Result<bool>> IsProfileSetupAsync(Guid userId, CancellationToken cancellationToken = default) {
        var isProfileSetup = await dbContext.Users
            .Where(u => u.Id == userId)
            .Select(u => u.IsProfileSetup)
            .Cast<bool?>()
            .FirstOrDefaultAsync(cancellationToken);

        if (isProfileSetup is not { } value) {
            return Errors.NoUserFoundFromId();
        }

        return Result<bool>.Success(value);
    }

    public async Task<Result> SetupProfileAsync(Guid userId, string userName, string displayName, CancellationToken cancellationToken = default) {
        var normalizedName = userManager.NormalizeName(userName);
        
        int numChanged = await dbContext.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(setter => {
                setter
                    .SetProperty(u => u.UserName, userName)
                    .SetProperty(u => u.NormalizedUserName, normalizedName)
                    .SetProperty(u => u.DisplayName, displayName)
                    .SetProperty(u => u.IsProfileSetup, true);
            }, cancellationToken);

        if (numChanged > 0) {
            return Result.Success();
        }

        return Errors.NoUserFoundFromId();
    }

    public async Task<Result<UserProfileDto>> GetProfileAsync(
        Guid userId, 
        UserProfileQueryFlags queryFlags,
        CancellationToken cancellationToken = default
    ) {
        UserProfileDto? result = await dbContext.Users
            .Where(u => u.Id == userId)
            .Select(u => new UserProfileDto(
                u.Id, 
                queryFlags.HasFlag(UserProfileQueryFlags.UserName) ? u.UserName : null, 
                queryFlags.HasFlag(UserProfileQueryFlags.DisplayName) ? u.DisplayName : null, 
                queryFlags.HasFlag(UserProfileQueryFlags.Avatar) ? u.HasAvatar : null,
                queryFlags.HasFlag(UserProfileQueryFlags.Biography) ? u.Biography : null,
                queryFlags.HasFlag(UserProfileQueryFlags.Pronouns) ? u.Pronouns : null,
                queryFlags.HasFlag(UserProfileQueryFlags.CreatedAt) ? u.CreatedAt : null
            ))
            .FirstOrDefaultAsync(cancellationToken);

        return result == null ? 
            Errors.NoUserFoundFromId() : 
            Result<UserProfileDto>.Success(result);
    }
    
    public async Task<List<UserProfileDto>> GetProfilesAsync(
        IReadOnlyCollection<Guid> userIds,
        UserProfileQueryFlags queryFlags,
        CancellationToken cancellationToken = default
    ) {
        List<UserProfileDto> results = await dbContext.Users
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new UserProfileDto(
                u.Id, 
                queryFlags.HasFlag(UserProfileQueryFlags.UserName) ? u.UserName : null, 
                queryFlags.HasFlag(UserProfileQueryFlags.DisplayName) ? u.DisplayName : null, 
                queryFlags.HasFlag(UserProfileQueryFlags.Avatar) ? u.HasAvatar : null,
                queryFlags.HasFlag(UserProfileQueryFlags.Biography) ? u.Biography : null,
                queryFlags.HasFlag(UserProfileQueryFlags.Pronouns) ? u.Pronouns : null,
                queryFlags.HasFlag(UserProfileQueryFlags.CreatedAt) ? u.CreatedAt : null
            ))
            .ToListAsync(cancellationToken);

        return results;
    }

    public async Task<Result<UserIdentityProfileDto>> GetIdentityProfileAsync(Guid userId, CancellationToken cancellationToken = default) {
        UserIdentityProfileDto? result = await dbContext.Users
            .Where(u => u.Id == userId)
            .Select(u => new UserIdentityProfileDto(
                u.Id, 
                u.UserName!, 
                u.DisplayName!, 
                u.HasAvatar
            ))
            .FirstOrDefaultAsync(cancellationToken);

        return result == null ? 
            Errors.NoUserFoundFromId() : 
            Result<UserIdentityProfileDto>.Success(result);
    }

    public async Task<List<UserIdentityProfileDto>> GetIdentityProfilesAsync(
        IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken = default
    ) {
        List<UserIdentityProfileDto> results = await dbContext.Users
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new UserIdentityProfileDto(
                u.Id, 
                u.UserName!, 
                u.DisplayName!, 
                u.HasAvatar
            ))
            .ToListAsync(cancellationToken);

        return results;
    }
}