using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Conflux.Infrastructure.Config;

public class CommunityServerConfiguration : IEntityTypeConfiguration<CommunityServer> {
    public void Configure(EntityTypeBuilder<CommunityServer> builder) {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.Name)
            .IsRequired()
            .HasMaxLength(48);

        builder.Property(s => s.Description)
            .HasMaxLength(128);

        builder.Property(s => s.OwnerUserId)
            .IsRequired();

        // TODO: Determine the behaviour when creator user is deleted (Cascade, Restrict, etc...)
        builder.HasOne(s => s.CreatorUser)
            .WithMany()
            .HasForeignKey(s => s.CreatorUserId)
            .HasPrincipalKey(s => s.Id)
            .IsRequired();
            
        // TODO: Determine the behaviour when owner user is deleted (Cascade, Restrict, etc...)
        builder.HasOne(s => s.OwnerUser)
            .WithMany()
            .HasForeignKey(s => s.OwnerUserId)
            .HasPrincipalKey(s => s.Id)
            .IsRequired();
    }
}