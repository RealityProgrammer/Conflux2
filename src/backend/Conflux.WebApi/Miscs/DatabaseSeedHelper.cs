using Bogus;
using Conflux.Domain;
using Conflux.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Conflux.WebApi.Miscs;

internal class DatabaseSeedHelper {
    private static readonly Lazy<Faker<ApplicationUser>> UserFaker = new(() => {
        var pronouns = new[] { "He/Him", "She/Her", "They/Them", "Deez/nuts", "No/Idea" };
        
        return new Faker<ApplicationUser>()
            .RuleFor(
                u => u.Id,
                (_, _) => Guid.CreateVersion7()
            )
            .RuleFor(
                u => u.UserName,
                (f, _) => f.Internet.UserName()
            )
            .RuleFor(
                u => u.DisplayName,
                (f, u) => u.UserName
            )
            .RuleFor(
                u => u.Email,
                (f, _) => f.Internet.Email()
            )
            .RuleFor(
                u => u.EmailConfirmed,
                (f, _) => f.Random.Bool(0.9f)
            )
            .RuleFor(
                u => u.IsProfileSetup,
                (f, u) => u.EmailConfirmed && f.Random.Bool(0.9f)
            )
            .RuleFor(
                u => u.Biography,
                (f, _) => f.Lorem.Sentence(16)
            )
            .RuleFor(
                u => u.Pronouns,
                (f, _) => f.PickRandom(pronouns)
            )
            .RuleFor(
                u => u.CreatedAt,
                (f, _) => f.Date.PastOffset(2));
    });
    
    public static async Task SeedUserAsync(
        UserManager<ApplicationUser> userManager,
        ApplicationDbContext dbContext,
        ILogger logger
    ) {
        // seed users with UUID from 1 to 100, query for the "holes".
        Guid[] targetIds = Enumerable.Range(1, 100)
            .Select(x => new Guid(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, (byte)x))
            .ToArray();
        
        var existingIds = await dbContext.Users
            .Where(u => ((IEnumerable<Guid>)targetIds).Contains(u.Id))
            .Select(u => u.Id)
            .ToListAsync();
        
        var missingIds = targetIds.Except(existingIds).ToList();

        if (missingIds.Count == 0) {
            return;
        }

        foreach (var missingId in missingIds) {
            var newUser = UserFaker.Value.Generate();
            newUser.Id = missingId;

            var result = await userManager.CreateAsync(newUser, "Password1!");

            if (!result.Succeeded) {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                logger.LogError("Failed to create user id {id}: {Errors}", missingId, errors);
            }
        }
    }
}