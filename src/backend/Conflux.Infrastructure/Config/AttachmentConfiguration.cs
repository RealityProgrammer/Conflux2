using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

internal sealed class AttachmentConfiguration : IEntityTypeConfiguration<Attachment> {
    public void Configure(EntityTypeBuilder<Attachment> builder) {
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Name).HasMaxLength(256);
        builder.Property(a => a.Type).HasMaxLength(24);
        
        builder.HasOne(a => a.Message)
            .WithMany(m => m.Attachments)
            .HasForeignKey(a => a.MessageId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}