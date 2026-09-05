using Conflux.Application.Dto;
using Conflux.Domain.Entities;
using Conflux.WebApi.GraphQL.Dto;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class CommunityServerMemberType : ObjectType<CommunityServerMember> {
    protected override void Configure(IObjectTypeDescriptor<CommunityServerMember> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(m => m.Id);
        descriptor.Field(m => m.UserId);
        descriptor.Field(m => m.User).Type<NonNullType<UserType>>();
        descriptor.Field(m => m.CommunityServerId);
        descriptor.Field(m => m.CommunityServer).Type<NonNullType<CommunityServerType>>();
        descriptor.Field(m => m.CreatedAt);
        descriptor.Field(m => m.Roles);
        descriptor.Field("authorizeInfo")
            .Type<NonNullType<MemberAuthorizeInfoType>>()
            .Resolve(async (context, cancellationToken) => {
                var member = context.Parent<CommunityServerMember>();
                var dataLoader = context.DataLoader<IMemberAuthorizationInfoDataLoader>();
                
                MemberAuthorizeKey key = new(member.Id, member.CommunityServerId, member.UserId);
                
                Domain.Result<MemberAuthorizeInfoDto> result = await dataLoader.LoadAsync(key, cancellationToken);
                
                return !result.IsSuccess ? throw new GraphQLException(ErrorBuilder.New().SetMessage(result.Error.Message).Build()) : result.Value;
            });
    }
}