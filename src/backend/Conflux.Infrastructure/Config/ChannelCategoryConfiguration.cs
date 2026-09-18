using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

public sealed class ChannelCategoryConfiguration : IEntityTypeConfiguration<ChannelCategory> {
    public void Configure(EntityTypeBuilder<ChannelCategory> builder) {
        builder.HasKey(x => x.Id);
        
        builder.HasOne(c => c.CommunityServer)
            .WithMany(s => s.ChannelCategories)
            .HasForeignKey(c => c.CommunityServerId)
            .HasPrincipalKey(s => s.Id)
            .OnDelete(DeleteBehavior.Cascade);
    }
}