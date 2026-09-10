using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

public sealed class CommunityServerMemberConfiguration : IEntityTypeConfiguration<CommunityServerMember> {
    public void Configure(EntityTypeBuilder<CommunityServerMember> builder) {
        builder.HasKey(m => m.Id);

        builder.HasOne(m => m.User)
            .WithMany(u => u.JoinedCommunityServers)
            .HasForeignKey(m => m.UserId)
            .HasPrincipalKey(u => u.Id)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(m => m.CommunityServer)
            .WithMany(s => s.Members)
            .HasForeignKey(m => m.CommunityServerId)
            .HasPrincipalKey(s => s.Id)
            .OnDelete(DeleteBehavior.Cascade);
    }
}