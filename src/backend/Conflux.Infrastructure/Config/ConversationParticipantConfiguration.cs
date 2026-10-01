using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

internal sealed class ConversationParticipantConfiguration : IEntityTypeConfiguration<ConversationParticipant> {
    public void Configure(EntityTypeBuilder<ConversationParticipant> builder) {
        builder.HasKey(p => new {
            p.ConversationId,
            p.UserId,
        });
        
        builder.HasOne(p => p.Conversation)
            .WithMany(c => c.Participants)
            .HasForeignKey(p => p.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(p => p.User)
            .WithMany(u => u.ConversationParticipants)
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}