using Conflux.Domain;
using Conflux.Domain.Entities;
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

        builder.Property(m => m.Body).HasMaxLength(4000);
            
        // relationship
        builder.HasOne(m => m.Sender)
            .WithMany()
            .HasForeignKey(m => m.SenderUserId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);  // delete messages when user is deleted
        
        // constraints
        builder.ToTable(tableBuilder => tableBuilder.HasCheckConstraint(
            "CK_Message_CannotReplyToSelf",
            """
            "Id" <> "ReplyToId"
            """
        ));
        
        // filters
        builder.HasQueryFilter("SoftDeletionFilter", b => b.DeletedAt == null);
    }
}