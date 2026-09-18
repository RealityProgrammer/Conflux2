using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Entities;

public class ChannelCategory : IHasCreatedAt {
    public Guid Id { get; set; }

    [MaxLength(32)] public string Name { get; set; } = null!;
    
    public Guid CommunityServerId { get; set; }
    public CommunityServer CommunityServer { get; set; } = null!;
    
    public DateTimeOffset CreatedAt { get; set; }

    public virtual ICollection<Channel> Channels { get; set; } = [];
}