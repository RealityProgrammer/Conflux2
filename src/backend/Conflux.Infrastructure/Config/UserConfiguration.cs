using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

public sealed class UserConfiguration : IEntityTypeConfiguration<ApplicationUser> {
    public void Configure(EntityTypeBuilder<ApplicationUser> builder) {
        builder.Property(u => u.DisplayName)
            .HasMaxLength(48);
        
        builder.Property(u => u.Biography)
            .HasMaxLength(255);
        
        builder.Property(u => u.Pronouns)
            .HasMaxLength(32);
        
        builder.HasQueryFilter("IgnoreDeletedUsers", u => u.DeletedAt == null);
    }
}