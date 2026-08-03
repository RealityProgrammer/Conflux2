using Conflux.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.ValueGeneration;
using System.Text.Json;

namespace Conflux.Infrastructure.Config;

internal sealed class MessageConfiguration : IEntityTypeConfiguration<Message> {
    public void Configure(EntityTypeBuilder<Message> builder) {
        builder.HasKey(m => m.Id);
        
        // key configuration to use uuid v7
        builder.Property(m => m.Id).HasValueGenerator<GuidV7ValueGenerator>();

        builder.Property(m => m.Attachments)
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<Attachment[]>(v, (JsonSerializerOptions?)null) ?? Array.Empty<Attachment>()
            );

        builder.HasIndex(m => m.ConversationId);
        
        // relationship
        builder.HasOne(m => m.Sender)
            .WithMany()
            .HasForeignKey(m => m.SenderUserId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);  // delete messages when user is deleted
    }
}