using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

internal sealed class MessageReactionConfiguration : IEntityTypeConfiguration<MessageReaction> {
    public void Configure(EntityTypeBuilder<MessageReaction> builder) {
        builder.HasKey(r => r.Id);

        builder.HasOne(r => r.Emoji)
            .WithMany()
            .HasForeignKey(r => r.EmojiId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(r => r.Message)
            .WithMany(m => m.Reaction)
            .HasForeignKey(r => r.MessageId)
            .OnDelete(DeleteBehavior.Cascade)
            .IsRequired();

        builder.Property(r => r.UserIds)
            .HasColumnType("uuid[]");
        
        // ensure that we cannot have duplicate Unicode reaction on same message id
        builder.HasIndex(r => new { r.MessageId, r.UnicodeValue })
            .IsUnique()
            .HasFilter("\"UnicodeValue\" IS NOT NULL");
        
        // same to emoji id
        builder.HasIndex(r => new { r.MessageId, r.EmojiId })
            .IsUnique()
            .HasFilter("\"EmojiId\" IS NOT NULL");
    }
}