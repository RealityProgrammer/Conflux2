using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Domain.Config;

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
    }
}