using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

internal sealed class MediaItemConfiguration : IEntityTypeConfiguration<MediaItem> {
    public void Configure(EntityTypeBuilder<MediaItem> builder) {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.FileName).HasMaxLength(256);
        builder.Property(a => a.ContentType).HasMaxLength(24);
        
        builder.HasOne(a => a.Message)
            .WithMany(m => m.Attachments)
            .HasForeignKey(a => a.MessageId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}