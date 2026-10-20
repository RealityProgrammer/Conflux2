using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Infrastructure.Repositories;

internal sealed class UserRepository(
    UserManager<ApplicationUser> userManager,
    ApplicationDbContext dbContext,
    TimeProvider timeProvider
) : IUserRepository {
    public IQueryable<ApplicationUser> AsQueryable() {
        return userManager.Users;
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
        var now = timeProvider.GetUtcNow();

        return await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE "AspNetUsers" AS u
            SET 
                "Email" = 'ghostuser_' || t.generated_name || '@purged.gone',
                "NormalizedEmail" = 'GHOSTUSER_' || UPPER(t.generated_name) || '@PURGED.GONE',
                "EmailConfirmed" = false,
                "TwoFactorEnabled" = false,
                "UserName" = 'ghostuser_' || t.generated_name,
                "NormalizedUserName" = 'GHOSTUSER_' || t.generated_name,
                "DisplayName" = 'ghostuser_' || t.generated_name,
                "PasswordHash" = 'PURGED_PASSWORD',
                "PhoneNumber" = NULL,
                "PhoneNumberConfirmed" = false,
                "AvatarId" = NULL,
                "BannerId" = NULL,
                "Biography" = NULL,
                "Pronouns" = NULL,
                "DeletedAt" = {now}
            FROM (
                SELECT 
                    "Id",
                    substr(md5(random()::text), 1, 16) AS generated_name
                FROM "AspNetUsers" 
                WHERE "Id" = ANY({userIds})
            ) AS t
            WHERE u."Id" = t."Id";
            """, cancellationToken);
    }
}