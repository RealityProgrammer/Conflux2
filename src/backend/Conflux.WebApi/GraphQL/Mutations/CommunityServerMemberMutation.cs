using Conflux.Application.Features.Servers;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Conflux.WebApi.Helpers;
using HotChocolate.Authorization;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.GraphQL.Mutations;

public sealed record UpdateCommunityServerMemberRolesPayload(Guid MemberId) {
    public async Task<CommunityServerMember> GetMemberAsync([Service] IServerMemberReadRepository repository) {
        return (await repository
            .AsQueryable()
            .AsNoTracking()
            .Where(m => m.Id == MemberId)
            .FirstOrDefaultAsync()
        )!;
    }
}

public sealed record KickCommunityServerMemberPayload(Guid MemberId);
public sealed record BanCommunityServerMemberPayload(Guid MemberId);
public sealed record UnbanCommunityServerMemberPayload(Guid MemberId);
public sealed record WarnCommunityServerMemberPayload(Guid MemberId);

[MutationType, Authorize]
internal static partial class CommunityServerMemberMutation {
    public static async Task<UpdateCommunityServerMemberRolesPayload> UpdateCommunityServerMemberRoles(
        Guid serverId,
        Guid memberId,
        IReadOnlyCollection<Guid> roleIds,
        [Service] IMediator mediator
    ) {
        var result = await mediator.Send(new UpdateMemberRolesCommand(serverId, memberId, roleIds));

        return result.IsSuccess ? 
            new(memberId) : 
            throw new GraphQLException(result.Error.ToHotChocolateError());
    }

    public static async Task<KickCommunityServerMemberPayload> KickCommunityServerMember(
        Guid serverId,
        Guid memberId,
        string? reason,
        [Service] IMediator mediator
    ) {
        var result = await mediator.Send(new KickServerMemberCommand(serverId, memberId, reason));

        return result.IsSuccess ?
            new(serverId) :
            throw new GraphQLException(result.Error.ToHotChocolateError());
    }
    
    public static async Task<BanCommunityServerMemberPayload> BanCommunityServerMember(
        Guid serverId,
        Guid memberId,
        string? reason,
        TimeSpan? duration,
        [Service] IMediator mediator
    ) {
        var result = await mediator.Send(new BanServerMemberCommand(serverId, memberId, reason, duration));

        return result.IsSuccess ?
            new(serverId) :
            throw new GraphQLException(result.Error.ToHotChocolateError());
    }
    
    public static async Task<UnbanCommunityServerMemberPayload> UnbanCommunityServerMember(
        Guid serverId,
        Guid memberId,
        [Service] IMediator mediator
    ) {
        var result = await mediator.Send(new UnbanServerMemberCommand(serverId, memberId));

        return result.IsSuccess ?
            new(serverId) :
            throw new GraphQLException(result.Error.ToHotChocolateError());
    }

    public static async Task<WarnCommunityServerMemberPayload> WarnCommunityServerMember(
        Guid serverId,
        Guid memberId,
        string? reason,
        [Service] IMediator mediator
    ) {
        var result = await mediator.Send(new WarnServerMemberCommand(serverId, memberId, reason));

        return result.IsSuccess ?
            new(serverId) :
            throw new GraphQLException(result.Error.ToHotChocolateError());
    }
}