using Conflux.Application.Dto;
using Conflux.Application.Features.Servers;
using Conflux.WebApi.GraphQL.Dto;
using Mediator;

namespace Conflux.WebApi.GraphQL;

internal static class DataLoader {
    [DataLoader]
    public static async Task<Dictionary<MemberAuthorizeKey, Domain.Result<MemberAuthorizeInfoDto>>> GetMemberAuthorizationInfo(
        IReadOnlyList<MemberAuthorizeKey> keys,
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

                return Domain.Result<MemberAuthorizeInfoDto>.Success(new(
                    result.Value!.AuthorizeLevel,
                    [..result.Value.EffectivePermissions.Select(kvp => new PermissionEntry(kvp.Key, kvp.Value))]
                ));
            }
        );
    }
}