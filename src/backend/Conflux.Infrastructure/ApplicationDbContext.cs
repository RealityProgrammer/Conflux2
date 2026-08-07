using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Infrastructure.Config;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Infrastructure;

public class ApplicationDbContext(
    DbContextOptions<ApplicationDbContext> options
) : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options) {
    public DbSet<FriendRequest> FriendRequests { get; set; }
    public DbSet<Conversation> Conversations { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<ChannelMember> ChannelMembers { get; set; }
    public DbSet<Channel> Channels { get; set; }

    protected override void OnModelCreating(ModelBuilder builder) {
        base.OnModelCreating(builder);
        
        new FriendRequestConfiguration().Configure(builder.Entity<FriendRequest>());
        new ChannelConfiguration().Configure(builder.Entity<Channel>());
        new ChannelMemberConfiguration().Configure(builder.Entity<ChannelMember>());
        new ConversationConfiguration().Configure(builder.Entity<Conversation>());
        new MessageConfiguration().Configure(builder.Entity<Message>());
    }
}