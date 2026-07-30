using Conflux.Domain;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

internal sealed class ChannelMemberConfiguration : IEntityTypeConfiguration<ChannelMember> {
    public void Configure(EntityTypeBuilder<ChannelMember> builder) {
        builder.HasKey(cm => new { cm.ChannelId, cm.UserId });
        
        builder.HasIndex(cm => cm.UserId);
    }
}