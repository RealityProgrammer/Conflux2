using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

public class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission> {
    public void Configure(EntityTypeBuilder<RolePermission> builder) {
        builder.HasKey(p => new {
            p.RoleId,
            p.Permission,
        });

        builder.Property(p => p.Permission).HasConversion<string>();
    }
}