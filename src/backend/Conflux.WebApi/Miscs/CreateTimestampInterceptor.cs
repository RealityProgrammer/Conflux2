using Conflux.Domain;
using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Conflux.WebApi.Miscs;

internal sealed class CreateTimestampInterceptor(TimeProvider timeProvider) : SaveChangesInterceptor {
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default
    ) {
        if (eventData.Context is not null) {
            UpdateTimestamps(eventData.Context);
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void UpdateTimestamps(DbContext context) {
        DateTimeOffset utcNow = timeProvider.GetUtcNow();

        foreach (var entry in context.ChangeTracker.Entries()) {
            if (entry is { State: EntityState.Added, Entity: IHasCreatedAt createdEntity }) {
                createdEntity.CreatedAt = utcNow;
            }
        }
    }
}