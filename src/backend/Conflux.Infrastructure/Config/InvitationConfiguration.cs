using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

public sealed class InvitationConfiguration : IEntityTypeConfiguration<Invitation> {
    public void Configure(EntityTypeBuilder<Invitation> builder) {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever().HasMaxLength(12);

        builder.HasOne(i => i.CommunityServer)
            .WithMany(s => s.Invitations)
            .HasForeignKey(i => i.CommunityServerId)
            .HasPrincipalKey(i => i.Id)
            .OnDelete(DeleteBehavior.Cascade);
    }
}