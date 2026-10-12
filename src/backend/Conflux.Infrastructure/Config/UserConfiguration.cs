using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

public sealed class UserConfiguration : IEntityTypeConfiguration<ApplicationUser> {
    public void Configure(EntityTypeBuilder<ApplicationUser> builder) {
        builder.HasOne(u => u.Avatar)
            .WithOne()
            .HasForeignKey<ApplicationUser>(u => u.AvatarId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(u => u.Banner)
            .WithOne()
            .HasForeignKey<ApplicationUser>(u => u.BannerId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}