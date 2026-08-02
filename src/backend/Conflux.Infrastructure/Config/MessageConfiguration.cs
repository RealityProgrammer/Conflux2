using Conflux.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.ValueGeneration;

namespace Conflux.Infrastructure.Config;

internal sealed class MessageConfiguration : IEntityTypeConfiguration<Message> {
    public void Configure(EntityTypeBuilder<Message> builder) {
        builder.HasKey(m => m.Id);
        
        // key configuration to use uuid v7
        builder.Property(m => m.Id).HasValueGenerator<GuidV7ValueGenerator>();

        builder.HasIndex(m => m.ConversationId);
        
        // relationship
        builder.HasOne(m => m.Sender)
            .WithMany()
            .HasForeignKey(m => m.SenderUserId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);  // delete messages when user is deleted
    }
}