using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

public sealed class ServerModerationLogConfiguration : IEntityTypeConfiguration<ServerModerationLog> {
    public void Configure(EntityTypeBuilder<ServerModerationLog> builder) {
        builder.HasKey(l => l.Id);

        builder.HasOne(l => l.ExecutorMember)
            .WithMany()
            .HasForeignKey(l => l.ExecutorMemberId)
            .OnDelete(DeleteBehavior.SetNull);
        
        builder.HasOne(l => l.AffectedMember)
            .WithMany()
            .HasForeignKey(l => l.AffectedMemberId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}