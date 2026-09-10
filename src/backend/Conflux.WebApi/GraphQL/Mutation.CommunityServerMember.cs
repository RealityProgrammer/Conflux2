using Conflux.Application.Features.Servers;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Conflux.WebApi.GraphQL.Attributes;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.GraphQL;

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

partial class Mutation {
    public static async Task<UpdateCommunityServerMemberRolesPayload> UpdateCommunityServerMemberRoles(
        Guid serverId,
        Guid memberId,
        IReadOnlyCollection<Guid> roleIds,
        [Service] IMediator mediator,
        [Service] IHttpContextAccessor httpContextAccessor
    ) {
        var idClaim = httpContextAccessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            var error = Errors.InvalidIdentifier();
            
            throw new GraphQLException(ErrorBuilder.New().SetCode(error.Code).SetMessage(error.Message).Build());
        }
        
        var result = await mediator.Send(new UpdateMemberRolesCommand(userId, serverId, memberId, roleIds));

        return result.IsSuccess ? 
            new(memberId) : 
            throw new GraphQLException(ErrorBuilder.New().SetCode(result.Error.Code).SetMessage(result.Error.Message).Build());
    }

    public static async Task<LeaveCommunityServerPayload> LeaveCommunityServer(
        Guid serverId,
        [Service] IMediator mediator,
        [Service] IHttpContextAccessor httpContextAccessor
    ) {
        var idClaim = httpContextAccessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            var error = Errors.InvalidIdentifier();
            throw new GraphQLException(ErrorBuilder.New().SetCode(error.Code).SetMessage(error.Message).Build());
        }

        var result = await mediator.Send(new LeaveServerCommand(userId, serverId));
        
        return result.IsSuccess ?
            new(serverId) :
            throw new GraphQLException(ErrorBuilder.New().SetCode(result.Error.Code).SetMessage(result.Error.Message).Build());
    }

    [RequireServerPermissions(ServerPermission.ManageMembers, ServerPermission.KickMembers)]
    public static async Task<KickCommunityServerMemberPayload> KickCommunityServerMember(
        Guid serverId,
        Guid memberId,
        [Service] IMediator mediator,
        [Service] IHttpContextAccessor httpContextAccessor
    ) {
        var idClaim = httpContextAccessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            var error = Errors.InvalidIdentifier();
            throw new GraphQLException(ErrorBuilder.New().SetCode(error.Code).SetMessage(error.Message).Build());
        }

        var result = await mediator.Send(new KickServerMemberCommand(userId, serverId, memberId));
        
        return result.IsSuccess ?
            new(serverId) :
            throw new GraphQLException(ErrorBuilder.New().SetCode(result.Error.Code).SetMessage(result.Error.Message).Build());
    }
}