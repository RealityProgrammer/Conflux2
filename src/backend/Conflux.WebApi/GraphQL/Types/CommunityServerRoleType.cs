using Conflux.Domain.Entities;
using Conflux.Infrastructure;
using Microsoft.EntityFrameworkCore;
using System.Collections.Frozen;

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
        descriptor.Field(r => r.CreatorUserId);
        descriptor.Field(r => r.CreatorUser).Type<UserType>();
        descriptor.Field("numMembers")
            .Type<NonNullType<IntType>>()
            .Resolve(async context => {
                var role = context.Parent<CommunityServerRole>();
                var dataLoader = context.DataLoader<IRolesMemberCountDataLoader>();
                
                return await dataLoader.LoadAsync(role.Id, context.RequestAborted);
            });
    }
    
    [DataLoader]
    public static async Task<IReadOnlyDictionary<Guid, int>> GetRolesMemberCount(
        IReadOnlyList<Guid> roleIds,
        [Service] IDbContextFactory<ApplicationDbContext> dbContextFactory,
        CancellationToken cancellationToken
    ) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync(cancellationToken);
        
        if (roleIds.Count == 0) {
            return FrozenDictionary<Guid, int>.Empty;
        }

        var counts = await dbContext.CommunityServerMemberRoles
            .AsNoTracking()
            .Where(r => roleIds.Contains(r.RoleId))
            .GroupBy(mr => mr.RoleId)
            .Select(g => new {
                RoleId = g.Key,
                Count = g.Count(),
            })
            .ToDictionaryAsync(x => x.RoleId, x => x.Count, cancellationToken);
        
        return roleIds.ToDictionary(id => id, id => counts.GetValueOrDefault(id, 0));
    }
}