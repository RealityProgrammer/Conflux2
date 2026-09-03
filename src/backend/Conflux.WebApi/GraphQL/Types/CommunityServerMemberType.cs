using Conflux.Domain.Entities;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class CommunityServerMemberType : ObjectType<CommunityServerMember> {
    protected override void Configure(IObjectTypeDescriptor<CommunityServerMember> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(m => m.Id);
        descriptor.Field(m => m.UserId);
        descriptor.Field(m => m.User).Type<UserType>();
        descriptor.Field(m => m.CommunityServerId);
        descriptor.Field(m => m.CommunityServer).Type<NonNullType<CommunityServerType>>();
        descriptor.Field(m => m.CreatedAt);
        descriptor.Field(m => m.Roles);
    }
}