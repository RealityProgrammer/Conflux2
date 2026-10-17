using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

public sealed class UserAccountDeletionConfiguration : IEntityTypeConfiguration<UserAccountDeletion> {
    public void Configure(EntityTypeBuilder<UserAccountDeletion> builder) {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ExtraMessage).HasMaxLength(255);
        
        builder.HasOne(e => e.User)
            .WithMany(u => u.AccountDeletions)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}