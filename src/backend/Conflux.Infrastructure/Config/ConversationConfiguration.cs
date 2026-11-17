using Conflux.Domain;
using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

internal sealed class ConversationConfiguration : IEntityTypeConfiguration<Conversation> {
    public void Configure(EntityTypeBuilder<Conversation> builder) {
        builder.HasKey(m => m.Id);
        
        // relationships
        builder.HasMany(c => c.Messages)
            .WithOne(m => m.Conversation)
            .HasForeignKey(m => m.ConversationId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);  // delete messages if the conversation is deleted
        
        builder.HasOne(c => c.FriendRequest)
            .WithOne(fr => fr.Conversation)
            .HasForeignKey<Conversation>(c => c.FriendRequestId)
            .HasPrincipalKey<FriendRequest>(fr => fr.Id)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.Channel)
            .WithOne(c => c.Conversation)
            .HasForeignKey<Conversation>(c => c.ChannelId)
            .HasPrincipalKey<Channel>(c => c.Id)
            .OnDelete(DeleteBehavior.Cascade);
    }
}