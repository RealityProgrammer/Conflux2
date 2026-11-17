using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.AspNetCore.Identity;
using System.Security.Cryptography;

namespace Conflux.Infrastructure.Repositories;

internal sealed class UserRepository(
    UserManager<ApplicationUser> userManager,
    ApplicationDbContext dbContext,
    TimeProvider timeProvider
) : IUserRepository {
    public IQueryable<ApplicationUser> AsQueryable() {
        return userManager.Users;
    }

    public void Add(ApplicationUser value) {
        userManager.CreateAsync(value);
    }

    public async Task<Result<UserIdentityProfileDto>> GetIdentityProfile(Guid userId, CancellationToken cancellationToken = default) {
        UserIdentityProfileDto? result = await dbContext.Users
            .Where(u => u.Id == userId)
            .SelectFacet<UserIdentityProfileDto>()
            .FirstOrDefaultAsync(cancellationToken);

        return result == null ? 
            Errors.NoUserFoundFromId() : 
            Result<UserIdentityProfileDto>.Success(result);
    }

    public async Task<List<UserIdentityProfileDto>> GetIdentityProfiles(
        IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken = default
    ) {
        List<UserIdentityProfileDto> results = await dbContext.Users
            .Where(u => userIds.Contains(u.Id))
            .SelectFacet<UserIdentityProfileDto>()
            .ToListAsync(cancellationToken);

        return results;
    }

    public async Task<Result<PresenceStatus>> GetManualPresenceStatus(Guid userId, CancellationToken cancellationToken = default) {
        var result = await dbContext.Users
            .Where(u => u.Id == userId)
            .Select(u => u.ManualPresenceStatus)
            .Cast<PresenceStatus?>()
            .FirstOrDefaultAsync(cancellationToken);

        if (result == null) {
            return Errors.NoUserFoundFromId();
        }

        return Result<PresenceStatus>.Success(result.Value);
    }

    public async Task<int> AnonymizeUsers(IReadOnlyList<Guid> userIds, CancellationToken cancellationToken = default) {
        if (userIds.Count == 0) return 0;

        var now = timeProvider.GetUtcNow();
        
        // expensive asf but what can we do...
        var users = await dbContext.Users
            .Where(u => userIds.Contains(u.Id))
            .ToListAsync(cancellationToken);

        if (users.Count == 0) return 0;
        
        foreach (var user in users) {
            string randomName = RandomNumberGenerator.GetString("0123456789abcdefghijklmnopqrstuvwxyz", 32);

            user.Email = $"ghostuser_{randomName}@purged.gone";
            user.NormalizedEmail = $"GHOSTUSER_{randomName.ToUpperInvariant()}@PURGED.GONE";
            user.EmailConfirmed = false;
            user.TwoFactorEnabled = false;
            user.UserName = $"ghostuser_{randomName}";
            user.NormalizedUserName = $"GHOSTUSER_{randomName}";
            user.DisplayName = $"ghostuser_{randomName}";
            user.PasswordHash = "PURGED_PASSWORD";
            user.PhoneNumber = null;
            user.PhoneNumberConfirmed = false;
            user.AvatarVersion = null;
            user.BannerVersion = null;
            user.Biography = null;
            user.Pronouns = null;
            user.DeletedAt = now;
            user.LockoutEnd = null;
            user.ManualPresenceStatus = PresenceStatus.Invisible;
            user.ConcurrencyStamp = null;
            user.SecurityStamp = null;
        }

        return await dbContext.SaveChangesAsync(cancellationToken);
    }
}