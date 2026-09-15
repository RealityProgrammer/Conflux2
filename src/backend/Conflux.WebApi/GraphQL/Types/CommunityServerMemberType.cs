using Conflux.Application.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.WebApi.GraphQL.Dto;
using Conflux.WebApi.GraphQL.Middlewares;
using Conflux.WebApi.Helpers;
using System.Runtime.Intrinsics.Arm;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class CommunityServerMemberType : ObjectType<CommunityServerMember> {
    protected override void Configure(IObjectTypeDescriptor<CommunityServerMember> descriptor) {
        descriptor.BindFieldsExplicitly();
        
        descriptor.Field(m => m.Id).IsProjected();
        descriptor.Field(m => m.UserId).IsProjected();
        descriptor.Field(m => m.User).Type<NonNullType<UserType>>();
        descriptor.Field(m => m.CommunityServerId).IsProjected();
        descriptor.Field(m => m.CommunityServer).Type<NonNullType<CommunityServerType>>();
        descriptor.Field(m => m.CreatedAt);
        descriptor.Field(m => m.Roles);
        descriptor.Field(m => m.BanExpireAt);
        descriptor.Field("authorizeInfo")
            .Type<NonNullType<MemberAuthorizeInfoType>>()
            .ParentRequires<CommunityServerMember>(m => new {
                m.Id, 
                m.CommunityServerId, 
                m.UserId,
            })
            .Resolve(async (context, cancellationToken) => {
                var member = context.Parent<CommunityServerMember>();
                var dataLoader = context.DataLoader<IMemberAuthorizationInfoDataLoader>();
                
                GetServerMemberAuthorizeKey key = new(member.Id, member.CommunityServerId, member.UserId);
                
                Domain.Result<MemberAuthorizeInfoDto> result = await dataLoader.LoadAsync(key, cancellationToken);
                
                return !result.IsSuccess ? throw new GraphQLException(result.Error.ToHotChocolateError()) : result.Value;
            });

        descriptor.Field(m => m.Status)
            .Use((_, next) => new RequireServerPermissionsMiddleware(next, [ServerPermission.ManageMembers]));

        descriptor.Field("numWarn")
            .Type<NonNullType<IntType>>()
            .ParentRequires<CommunityServerMember>(m => new {
                m.Id,
                m.CommunityServerId,
            })
            .Resolve(async (context, cancellationToken) => {
                var member = context.Parent<CommunityServerMember>();
                var dataLoader = context.DataLoader<IServerMembersWarnCountsDataLoader>();

                return await dataLoader.LoadAsync(member.Id, cancellationToken);
            });
    }
}