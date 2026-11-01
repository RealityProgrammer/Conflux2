using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System.Text.Json;

namespace Conflux.Infrastructure.Config;

internal sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification> {
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.General) {
        AllowOutOfOrderMetadataProperties = true,
    };
    
    public void Configure(EntityTypeBuilder<Notification> builder) {
        builder.HasKey(x => x.Id);
        
        builder.HasOne(x => x.User)
            .WithMany(u => u.Notifications)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new {
            x.UserId,
            x.IsRead,
        });

        builder.Property(x => x.Payload)
            .HasColumnType("jsonb")
            .HasConversion(
                v => JsonSerializer.Serialize(v, JsonOptions),
                v => JsonSerializer.Deserialize<INotificationPayload>(v, JsonOptions)!
            )
            .IsRequired();
    }
}