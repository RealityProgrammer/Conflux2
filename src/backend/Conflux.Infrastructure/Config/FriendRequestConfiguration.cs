using Conflux.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

internal sealed class FriendRequestConfiguration : IEntityTypeConfiguration<FriendRequest> {
    public void Configure(EntityTypeBuilder<FriendRequest> builder) {
        builder.HasKey(x => x.Id);
        
        // preventing self friend request on DB level
        builder.ToTable(x => x.HasCheckConstraint(
            "CK_FriendRequest_NotSelf",
            """
            "SenderUserId" <> "ReceiverUserId"
            """
        ));
        
        // relationships
        builder.HasOne(r => r.Sender)
            .WithMany(u => u.SentFriendRequests)
            .HasForeignKey(r => r.SenderUserId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);  // delete if sender is deleted

        builder.HasOne(r => r.Receiver)
            .WithMany(u => u.ReceivedFriendRequests)
            .HasForeignKey(r => r.ReceiverUserId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);  // delete if receiver is deleted
    }
}