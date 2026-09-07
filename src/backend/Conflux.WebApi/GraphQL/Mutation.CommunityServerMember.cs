using Conflux.Application.Features.Servers;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Mediator;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.GraphQL;

public sealed record UpdateCommunityServerMemberRolesPayload {
    public Guid MemberId { get; }

    public UpdateCommunityServerMemberRolesPayload(Guid memberId) {
        MemberId = memberId;
    }

    public async Task<CommunityServerMember> GetMemberAsync([Service] IServerMemberReadRepository repository) {
        return (await repository
            .AsQueryable()
            .AsNoTracking()
            .Where(m => m.Id == MemberId)
            .FirstOrDefaultAsync()
        )!;
    }
}

partial class Mutation {
    public async Task<UpdateCommunityServerMemberRolesPayload> UpdateCommunityServerMemberRoles(
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

        if (result.IsSuccess) {
            return new(memberId);
        }

        throw new GraphQLException(ErrorBuilder.New().SetCode(result.Error.Code).SetMessage(result.Error.Message).Build());
    }
}