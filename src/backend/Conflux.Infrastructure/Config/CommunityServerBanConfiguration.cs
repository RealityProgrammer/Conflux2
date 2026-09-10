using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

public sealed class CommunityServerBanConfiguration : IEntityTypeConfiguration<CommunityServerBan> {
    public void Configure(EntityTypeBuilder<CommunityServerBan> builder) {
        builder.HasKey(b => b.Id);

        builder.HasOne(b => b.BannedMember)
            .WithMany(m => m.Bans)
            .HasForeignKey(b => b.BannedMemberId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(b => b.ExecutorMember)
            .WithMany()
            .HasForeignKey(b => b.ExecutorMemberId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
