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

public sealed record LeaveCommunityServerPayload(Guid ServerId);

public sealed record KickCommunityServerMemberPayload(Guid MemberId);

public sealed record BanCommunityServerMemberPayload(Guid MemberId);
public sealed record UnbanCommunityServerMemberPayload(Guid MemberId);

[MutationType, Authorize]
internal static class CommunityServerMemberMutation {
    public static async Task<UpdateCommunityServerMemberRolesPayload> UpdateCommunityServerMemberRoles(
        Guid serverId,
        Guid memberId,
        IReadOnlyCollection<Guid> roleIds,
        [Service] IMediator mediator,
        [Service] IHttpContextAccessor httpContextAccessor
    ) {
        var idClaim = httpContextAccessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }
        
        var result = await mediator.Send(new UpdateMemberRolesCommand(userId, serverId, memberId, roleIds));

        return result.IsSuccess ? 
            new(memberId) : 
            throw new GraphQLException(result.Error.ToHotChocolateError());
    }

    public static async Task<LeaveCommunityServerPayload> LeaveCommunityServer(
        Guid serverId,
        [Service] IMediator mediator,
        [Service] IHttpContextAccessor httpContextAccessor
    ) {
        var idClaim = httpContextAccessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }

        var result = await mediator.Send(new LeaveServerCommand(userId, serverId));
        
        return result.IsSuccess ?
            new(serverId) :
            throw new GraphQLException(result.Error.ToHotChocolateError());
    }

    public static async Task<KickCommunityServerMemberPayload> KickCommunityServerMember(
        Guid serverId,
        Guid memberId,
        string? reason,
        [Service] IMediator mediator,
        [Service] IHttpContextAccessor httpContextAccessor
    ) {
        var idClaim = httpContextAccessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }

        var result = await mediator.Send(new KickServerMemberCommand(userId, serverId, memberId, reason));

        return result.IsSuccess ?
            new(serverId) :
            throw new GraphQLException(result.Error.ToHotChocolateError());
    }
    
    public static async Task<BanCommunityServerMemberPayload> BanCommunityServerMember(
        Guid serverId,
        Guid memberId,
        string? reason,
        TimeSpan? duration,
        [Service] IMediator mediator,
        [Service] IHttpContextAccessor httpContextAccessor
    ) {
        var idClaim = httpContextAccessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }
        
        var result = await mediator.Send(new BanServerMemberCommand(userId, serverId, memberId, reason, duration));

        return result.IsSuccess ?
            new(serverId) :
            throw new GraphQLException(result.Error.ToHotChocolateError());
    }
    
    public static async Task<UnbanCommunityServerMemberPayload> UnbanCommunityServerMember(
        Guid serverId,
        Guid memberId,
        [Service] IMediator mediator,
        [Service] IHttpContextAccessor httpContextAccessor
    ) {
        var idClaim = httpContextAccessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }
        
        var result = await mediator.Send(new UnbanServerMemberCommand(userId, serverId, memberId));

        return result.IsSuccess ?
            new(serverId) :
            throw new GraphQLException(result.Error.ToHotChocolateError());
    }
}