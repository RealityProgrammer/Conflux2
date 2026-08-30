using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

public sealed class CommunityServerRoleConfiguration : IEntityTypeConfiguration<CommunityServerRole> {
    public void Configure(EntityTypeBuilder<CommunityServerRole> builder) {
        builder.HasKey(e => e.Id);

        builder.HasOne(r => r.CommunityServer)
            .WithMany(s => s.Roles)
            .HasForeignKey(r => r.CommunityServerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.CreatorUser)
            .WithMany()
            .HasForeignKey(r => r.CreatorUserId)
            .OnDelete(DeleteBehavior.SetNull);
        
        builder.HasMany(r => r.Permissions)
            .WithOne(p => p.Role)
            .HasForeignKey(p => p.RoleId)
            .HasPrincipalKey(r => r.Id)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasMany(r => r.Members)
            .WithMany(m => m.Roles)
            .UsingEntity<CommunityServerMemberRole>(
                j => j.HasOne(mr => mr.Member).WithMany(m => m.MemberRoles).HasForeignKey(mr => mr.MemberId),
                j => j.HasOne(mr => mr.Role).WithMany(r => r.MembersWithRole).HasForeignKey(mr => mr.RoleId)
            );
    }
}