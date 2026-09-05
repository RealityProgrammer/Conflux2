using Conflux.WebApi.GraphQL.Dto;

namespace Conflux.WebApi.GraphQL.Types;

internal sealed class MemberAuthorizeInfoType : ObjectType<MemberAuthorizeInfoDto> {
    protected override void Configure(IObjectTypeDescriptor<MemberAuthorizeInfoDto> descriptor) {
        descriptor.Name("MemberAuthorizeInfo");

        descriptor.Field(x => x.AuthorizeLevel);
        descriptor.Field(x => x.Permissions);
    }
}