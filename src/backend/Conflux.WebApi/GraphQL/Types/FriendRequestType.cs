using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using GreenDonut.Data;
using HotChocolate.Resolvers;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class FriendRequestType : ObjectType<FriendRequest> {
    protected override void Configure(IObjectTypeDescriptor<FriendRequest> descriptor) {
        descriptor.BindFieldsExplicitly();
        
        descriptor.Field(r => r.Id).IsProjected();
        descriptor.Field(r => r.ConversationChannel);
        descriptor.Field(r => r.CreatedAt);
        descriptor.Field(r => r.Receiver);
        descriptor.Field(r => r.ReceiverUserId);
        descriptor.Field(r => r.Sender);
        descriptor.Field(r => r.SenderUserId);
        descriptor.Field(r => r.Status);
        descriptor.Field("otherUser")
            .Type<UserType>()
            .ParentRequires<FriendRequest>(r => new { r.ReceiverUserId, r.SenderUserId })
            .ResolveWith(ResolveOtherUser);
        
        return;
        
        async Task<ApplicationUser?> ResolveOtherUser(
            IResolverContext context, 
            QueryContext<ApplicationUser> queryContext, 
            CancellationToken cancellationToken
        ) {
            var parent = context.Parent<FriendRequest>();
            var httpContextAccessor = context.Service<IHttpContextAccessor>();
            
            var sessionUserIdStr = httpContextAccessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            
            if (!Guid.TryParse(sessionUserIdStr, out var sessionUserId)) {
                return null;
            }
            
            Guid otherUserId;
            if (parent.SenderUserId == sessionUserId) {
                otherUserId = parent.ReceiverUserId;
            } else if (parent.ReceiverUserId == sessionUserId) {
                otherUserId = parent.SenderUserId;
            } else {
                return null; 
            }
            
            var dataLoader = context.DataLoader<IUserByIdDataLoader>();
            return await dataLoader.With(queryContext).LoadAsync(otherUserId, cancellationToken);
        }
    }

    [DataLoader]
    public static async Task<IReadOnlyDictionary<Guid, ApplicationUser>> GetUserByIdAsync(
        IReadOnlyList<Guid> userIds,
        QueryContext<ApplicationUser> queryContext,
        IDbContextFactory<ApplicationDbContext> dbContextFactory,
        CancellationToken cancellationToken
    ) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        var dict = await dbContext.Users
            .Where(u => userIds.Contains(u.Id))
            .With(queryContext)
            .ToDictionaryAsync(u => u.Id, cancellationToken);

        return dict;
    }
}