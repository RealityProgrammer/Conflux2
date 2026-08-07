using Conflux.Domain;
using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

internal sealed class ChannelConfiguration : IEntityTypeConfiguration<Channel> {
    public void Configure(EntityTypeBuilder<Channel> builder) {
        builder.HasKey(c => c.Id);
        
        builder.HasOne(c => c.Conversation)
            .WithOne(c => c.Channel)
            .HasForeignKey<Channel>(c => c.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(c => c.FriendRequest)
            .WithOne(r => r.ConversationChannel)
            .HasForeignKey<Channel>(c => c.FriendRequestId)
            .OnDelete(DeleteBehavior.SetNull);  // keep chat history even if friend request is gone
    }
}