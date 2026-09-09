using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

public sealed class CommunityServerMemberRoleConfiguration : IEntityTypeConfiguration<CommunityServerMemberRole> {
    public void Configure(EntityTypeBuilder<CommunityServerMemberRole> builder) {
        builder.HasKey(r => new { r.MemberId, r.RoleId });
        
        builder.HasOne(r => r.Member)
            .WithMany(m => m.MemberRoles)
            .HasForeignKey(r => r.MemberId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(r => r.Role)
            .WithMany(r => r.MemberRoles)
            .HasForeignKey(r => r.RoleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}