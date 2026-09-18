using Conflux.Domain.Entities;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class CommunityServerType : ObjectType<CommunityServer> {
    protected override void Configure(IObjectTypeDescriptor<CommunityServer> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(s => s.Id);
        descriptor.Field(s => s.Name);
        descriptor.Field(s => s.Description);
        descriptor.Field(s => s.HasAvatar);
        descriptor.Field(s => s.CreatedAt);
        descriptor.Field(s => s.CreatorUserId);
        descriptor.Field(s => s.CreatorUser).Type<UserType>();
        descriptor.Field(s => s.OwnerUserId);
        descriptor.Field(s => s.OwnerUser).Type<UserType>();
        descriptor.Field(s => s.ChannelCategories)
            .Type<ListType<ChannelCategoryType>>();
        descriptor.Field(s => s.Channels)
            .Type<ListType<ChannelType>>();
        descriptor.Field("numMembers")
            .Type<NonNullType<IntType>>()
            .Resolve(async context => {
                var server = context.Parent<CommunityServer>();
                var dataLoader = context.DataLoader<ICommunityServersMemberCountDataLoader>();
                    
                return await dataLoader.LoadAsync(server.Id, context.RequestAborted);
            });
    }
}