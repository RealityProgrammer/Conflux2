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
    public DbSet<Channel> Channels { get; set; }
    public DbSet<CommunityServer> CommunityServers { get; set; }
    public DbSet<CommunityServerMember> CommunityServerMembers { get; set; }
    public DbSet<ChannelCategory> ChannelCategories { get; set; }
    public DbSet<Invitation> Invitations { get; set; }
    public DbSet<CommunityServerRole> CommunityServerRoles { get; set; }
    public DbSet<CommunityServerMemberRole> CommunityServerMemberRoles { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    public DbSet<CommunityServerBan> CommunityServerBans { get; set; }
    public DbSet<ServerModerationLog> ServerModerationLogs { get; set; }
    
    protected override void OnModelCreating(ModelBuilder builder) {
        base.OnModelCreating(builder);
        
        new FriendRequestConfiguration().Configure(builder.Entity<FriendRequest>());
        new ChannelConfiguration().Configure(builder.Entity<Channel>());
        new ConversationConfiguration().Configure(builder.Entity<Conversation>());
        new MessageConfiguration().Configure(builder.Entity<Message>());
        new CommunityServerConfiguration().Configure(builder.Entity<CommunityServer>());
        new CommunityServerMemberConfiguration().Configure(builder.Entity<CommunityServerMember>());
        new InvitationConfiguration().Configure(builder.Entity<Invitation>());
        new CommunityServerRoleConfiguration().Configure(builder.Entity<CommunityServerRole>());
        new CommunityServerMemberRoleConfiguration().Configure(builder.Entity<CommunityServerMemberRole>());
        new RolePermissionConfiguration().Configure(builder.Entity<RolePermission>());
        new CommunityServerBanConfiguration().Configure(builder.Entity<CommunityServerBan>());
    }
}