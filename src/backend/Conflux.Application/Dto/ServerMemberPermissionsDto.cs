using Conflux.Domain.Enums;
using System.Text.Json.Serialization;

namespace Conflux.Application.Dto;

public sealed record ServerMemberPermissionsDto(
    Guid MemberId,
    [property: JsonConverter(typeof(JsonNumberEnumConverter<ServerPermissions>))] ServerPermissions EffectivePermissions,
    int AuthorizeLevel,
    CommunityServerRoleDto[] Roles
);