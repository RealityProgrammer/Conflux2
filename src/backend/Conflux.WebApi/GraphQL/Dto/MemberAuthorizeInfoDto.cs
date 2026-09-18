using Conflux.Application.Dto;
using Conflux.Domain.Enums;
using Facet;
using System.Collections.Frozen;

namespace Conflux.WebApi.GraphQL.Dto;

[Facet(typeof(ServerMemberAuthorizeInfoDto), Include = [
    nameof(ServerMemberAuthorizeInfoDto.AuthorizeLevel),
    nameof(ServerMemberAuthorizeInfoDto.EffectivePermissions),
    nameof(ServerMemberAuthorizeInfoDto.IsBanned),
])]
public sealed partial record MemberAuthorizeInfoDto {
    [MapFrom(nameof(ServerMemberAuthorizeInfoDto.EffectivePermissions))]
    public IReadOnlySet<ServerPermission> Permissions { get; set; } = Permissions;
}