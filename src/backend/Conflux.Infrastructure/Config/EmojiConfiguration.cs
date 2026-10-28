using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

internal sealed class EmojiConfiguration : IEntityTypeConfiguration<Emoji> {
    public void Configure(EntityTypeBuilder<Emoji> builder) {
        builder.HasKey(e => e.Id);

        builder.Property(e => e.ShortCode).HasMaxLength(48);
        
        builder.HasOne(e => e.Server)
            .WithMany(s => s.Emojis)
            .HasForeignKey(e => e.ServerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}