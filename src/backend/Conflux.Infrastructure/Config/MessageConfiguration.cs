using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System.Text.Json;

namespace Conflux.Infrastructure.Config;

internal sealed class MessageConfiguration : IEntityTypeConfiguration<Message> {
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.General) {
        AllowOutOfOrderMetadataProperties = true,
    };
    
    public void Configure(EntityTypeBuilder<Message> builder) {
        builder.HasKey(m => m.Id);
        
        // key configuration to use uuid v7
        builder.Property(m => m.Id).HasValueGenerator<GuidV7ValueGenerator>();

        builder.Property(m => m.Body).HasMaxLength(4000);

        builder.Property(m => m.Properties)
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, JsonOptions),
                v => JsonSerializer.Deserialize<MessageProperties>(v, JsonOptions)!
            );
            
        // relationship
        builder.HasOne(m => m.Sender)
            .WithMany()
            .HasForeignKey(m => m.SenderUserId)
            .OnDelete(DeleteBehavior.Cascade);  // delete messages when user is deleted

        builder.HasOne(m => m.ReplyTo)
            .WithMany(m => m.Replies)
            .HasForeignKey(m => m.ReplyToId)
            .OnDelete(DeleteBehavior.Restrict);
        
        // constraints
        builder.ToTable(tableBuilder => {
            tableBuilder.HasCheckConstraint(
                "CK_Message_CannotReplyToSelf",
                """
                "Id" <> "ReplyToId"
                """
            );
        });
        
        // filters
        builder.HasQueryFilter("SoftDeletionFilter", b => b.DeletedAt == null);
    }
}