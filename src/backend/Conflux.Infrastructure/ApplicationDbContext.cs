using Conflux.Domain;
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

    protected override void OnModelCreating(ModelBuilder builder) {
        base.OnModelCreating(builder);
        
        new FriendRequestConfiguration().Configure(builder.Entity<FriendRequest>());
        new ConversationConfiguration().Configure(builder.Entity<Conversation>());
        new MessageConfiguration().Configure(builder.Entity<Message>());
    }
}