using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Domain.Config;

internal sealed class ConversationConfiguration : IEntityTypeConfiguration<Conversation> {
    public void Configure(EntityTypeBuilder<Conversation> builder) {
        builder.HasKey(m => m.Id);
        
        // relationships
        builder.HasMany(c => c.Messages)
            .WithOne(m => m.Conversation)
            .HasForeignKey(m => m.ConversationId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);  // delete messages if the conversation is deleted
    }
}