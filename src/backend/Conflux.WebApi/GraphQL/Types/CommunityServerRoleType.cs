using Conflux.Domain.Entities;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class CommunityServerRoleType : ObjectType<CommunityServerRole> {
    protected override void Configure(IObjectTypeDescriptor<CommunityServerRole> descriptor) {
        descriptor.BindFieldsExplicitly();
        
        descriptor.Field(r => r.Id);
        descriptor.Field(r => r.Name);
        descriptor.Field(r => r.CommunityServerId);
        descriptor.Field(r => r.CommunityServer).Type<NonNullType<CommunityServerType>>();
        descriptor.Field(r => r.CreatedAt);
        descriptor.Field(r => r.AuthorizeLevel);
        descriptor.Field(r => r.SpecialRoleType);
        descriptor.Field(r => r.Permissions).UsePaging(options: new() {
            IncludeTotalCount = true,
            DefaultPageSize = 20,
            MaxPageSize = 50,
        }).Type<NonNullType<ListType<NonNullType<RolePermissionType>>>>();
    }
}