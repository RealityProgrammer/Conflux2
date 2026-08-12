using Conflux.Domain.Entities;
using Conflux.WebApi.GraphQL.DataLoaders;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class UserType : ObjectType<ApplicationUser> {
    protected override void Configure(IObjectTypeDescriptor<ApplicationUser> descriptor) {
        descriptor.BindFieldsExplicitly();
        
        descriptor.Field(u => u.Id);
        descriptor.Field(u => u.UserName);
        descriptor.Field(u => u.DisplayName);
        descriptor.Field(u => u.HasAvatar);
        descriptor.Field(u => u.AvatarUpdatedAt);
        descriptor.Field(u => u.Biography);
        descriptor.Field(u => u.Pronouns);
        descriptor.Field(u => u.CreatedAt);

        descriptor.Field("numMutualFriends")
            .Type<NonNullType<IntType>>()
            .Resolve(async context => {
                var targetUser = context.Parent<ApplicationUser>();
                var dataLoader = context.DataLoader<MutualFriendsCountDataLoader>();
                
                return await dataLoader.LoadAsync(targetUser.Id, context.RequestAborted);
            });
    }
}