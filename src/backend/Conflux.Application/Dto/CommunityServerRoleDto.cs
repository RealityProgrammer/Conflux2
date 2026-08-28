using Conflux.Domain.Enums;
using System.Text.Json.Serialization;

namespace Conflux.Application.Dto;

public sealed record CommunityServerRoleDto(
    Guid Id,
    string Name,
    [property: JsonConverter(typeof(JsonNumberEnumConverter<ServerPermissions>))] ServerPermissions Permissions,
    int AuthorizeLevel
);