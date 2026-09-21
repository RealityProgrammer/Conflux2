using Conflux.Application.Features.Users;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.WebApi.Helpers;
using HotChocolate.Authorization;
using Mediator;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.GraphQL.Mutations;

public sealed record UpdateManualPresenceStatusPayload(Guid UserId);

[MutationType, Authorize]
internal static partial class ApplicationUserMutation {
    public static async Task<UpdateManualPresenceStatusPayload> UpdateManualPresenceStatus(
        PresenceStatus status,
        [Service] IMediator mediator,
        [Service] IHttpContextAccessor httpContextAccessor
    ) {
        var idClaim = httpContextAccessor.HttpContext?.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }

        var result = await mediator.Send(new UpdateManualPresenceStatusCommand(userId, status));

        return result.IsSuccess ?
            new(userId) :
            throw new GraphQLException(result.Error.ToHotChocolateError());
    }
}