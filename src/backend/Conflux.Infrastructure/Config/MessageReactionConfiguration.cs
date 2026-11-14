using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System.Text.Json;

namespace Conflux.Infrastructure.Config;

internal sealed class MessageReactionConfiguration : IEntityTypeConfiguration<MessageReaction> {
    public void Configure(EntityTypeBuilder<MessageReaction> builder) {
        builder.HasKey(r => r.MessageId);

        builder.Property(r => r.Reactions)
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v),
                v => JsonSerializer.Deserialize<Dictionary<string, HashSet<Guid>>>(v) ?? new()
            );
        
        builder.HasOne(r => r.Message)
            .WithOne(m => m.Reaction)
            .HasForeignKey<MessageReaction>(r => r.MessageId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}