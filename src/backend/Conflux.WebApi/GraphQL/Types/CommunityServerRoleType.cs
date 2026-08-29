using Conflux.Domain.Entities;
using Conflux.WebApi.GraphQL.DataLoaders;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class CommunityServerRoleType : ObjectType<CommunityServerRole> {
    protected override void Configure(IObjectTypeDescriptor<CommunityServerRole> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(r => r.Id).IsProjected();
        descriptor.Field(r => r.Name);
        descriptor.Field(r => r.CommunityServerId);
        descriptor.Field(r => r.CommunityServer).Type<NonNullType<CommunityServerType>>();
        descriptor.Field(r => r.CreatedAt);
        descriptor.Field(r => r.AuthorizeLevel);
        descriptor.Field(r => r.SpecialRoleType);
        descriptor.Field(r => r.Permissions).Type<NonNullType<ListType<NonNullType<RolePermissionType>>>>();
        descriptor.Field("numMembers")
            .Type<NonNullType<IntType>>()
            .Resolve(async context => {
                var role = context.Parent<CommunityServerRole>();
                var dataLoader = context.DataLoader<RoleMemberCountDataLoader>();
                
                return await dataLoader.LoadAsync(role.Id, context.RequestAborted);
            });
    }
}