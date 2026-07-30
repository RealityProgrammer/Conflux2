using Conflux.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

internal sealed class MessageConfiguration : IEntityTypeConfiguration<Message> {
    public void Configure(EntityTypeBuilder<Message> builder) {
        builder.HasKey(m => m.Id);

        builder.HasIndex(m => m.ConversationId);
        
        // relationship
        builder.HasOne(m => m.Sender)
            .WithMany()
            .HasForeignKey(m => m.SenderUserId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);  // delete messages when user is deleted
    }
}