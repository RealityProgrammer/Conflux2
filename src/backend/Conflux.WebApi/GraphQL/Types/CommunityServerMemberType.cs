using Conflux.Application.Dto;
using Conflux.Application.Features.Servers;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Infrastructure;
using Conflux.WebApi.GraphQL.Dto;
using Conflux.WebApi.GraphQL.Middlewares;
using Conflux.WebApi.Helpers;
using Mediator;
using Microsoft.EntityFrameworkCore;
using System.Collections.Frozen;
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
    
    [DataLoader]
    public static async Task<Dictionary<GetServerMemberAuthorizeKey, Domain.Result<MemberAuthorizeInfoDto>>> GetMemberAuthorizationInfo(
        IReadOnlyList<GetServerMemberAuthorizeKey> keys,
        [Service] IMediator mediator,
        CancellationToken cancellationToken
    ) {
        var authResults = await mediator.Send(
            new GetMembersServerAuthorizationInfoQuery(keys), 
            cancellationToken
        );

        return keys.ToDictionary(
            key => key,
            key => {
                // the results are keyed by member id, if changed, change in the GetMembersAuthorizationInfoHandler too
                var result = authResults[key.MemberId];

                if (!result.IsSuccess)
                    return Domain.Result<MemberAuthorizeInfoDto>.Failure(result.Error);

                var authInfo = result.Value!;
                
                return Domain.Result<MemberAuthorizeInfoDto>.Success(new(authInfo));
            }
        );
    }
    
    [DataLoader]
    public static async Task<IReadOnlyDictionary<Guid, int>> GetCommunityServersMemberCount(
        IReadOnlyList<Guid> serverIds,
        [Service] IDbContextFactory<ApplicationDbContext> dbContextFactory,
        CancellationToken cancellationToken
    ) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        if (serverIds.Count == 0) {
            return FrozenDictionary<Guid, int>.Empty;
        }
        
        var counts = await dbContext.CommunityServerMembers
            .AsNoTracking()
            .Where(m => serverIds.Contains(m.CommunityServerId) && m.Status == MembershipStatus.Active)
            .GroupBy(m => m.CommunityServerId)
            .Select(g => new {
                ServerId = g.Key,
                Count = g.Count(),
            })
            .ToDictionaryAsync(x => x.ServerId, x => x.Count, cancellationToken);
    
        return serverIds.ToDictionary(id => id, id => counts.GetValueOrDefault(id, 0));
    }
    
    [DataLoader]
    public static async Task<IReadOnlyDictionary<Guid, int>> GetServerMembersWarnCounts(
        IReadOnlyList<Guid> memberIds,
        [Service] IDbContextFactory<ApplicationDbContext> dbContextFactory,
        CancellationToken cancellationToken
    ) {
        if (memberIds.Count == 0) {
            return FrozenDictionary<Guid, int>.Empty;
        }
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        Dictionary<Guid, int> dict = await dbContext.ServerModerationLogs
            .Where(l => l.Action == ServerModerationAction.Warn)
            .Where(l => l.AffectedMemberId != null && memberIds.Contains(l.AffectedMemberId.Value))
            .GroupBy(l => l.AffectedMemberId!.Value)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Key, g => g.Count, cancellationToken);

        return memberIds.ToDictionary(
            id => id,
            id => dict.GetValueOrDefault(id, 0)
        );
    }
}