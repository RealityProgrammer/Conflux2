using Conflux.Domain.Entities;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class CommunityServerObjectType : ObjectType<CommunityServer> {
    protected override void Configure(IObjectTypeDescriptor<CommunityServer> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(s => s.Id);
        descriptor.Field(s => s.Name);
        descriptor.Field(s => s.Description);
        descriptor.Field(s => s.AvatarId);
        descriptor.Field(s => s.Avatar).Type<MediaItemObjectType>();
        descriptor.Field(s => s.BannerId);
        descriptor.Field(s => s.Banner).Type<MediaItemObjectType>();
        descriptor.Field(s => s.CreatedAt);
        descriptor.Field(s => s.CreatorUserId);
        descriptor.Field(s => s.CreatorUser).Type<ApplicationUserObjectType>();
        descriptor.Field(s => s.OwnerUserId);
        descriptor.Field(s => s.OwnerUser).Type<ApplicationUserObjectType>();
        descriptor.Field(s => s.ChannelCategories)
            .Type<ListType<ChannelCategoryObjectType>>();
        descriptor.Field(s => s.Channels)
            .Type<ListType<ChannelObjectType>>();
        descriptor.Field("numMembers")
            .Type<NonNullType<IntType>>()
            .Resolve(async context => {
                var server = context.Parent<CommunityServer>();
                var dataLoader = context.DataLoader<ICommunityServersMemberCountDataLoader>();
                    
                return await dataLoader.LoadAsync(server.Id, context.RequestAborted);
            });
    }
}