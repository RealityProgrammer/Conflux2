using System.Text.Json.Serialization;

namespace Conflux.Domain.Dto;

public sealed record UserProfileDto(
    Guid Id,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? UserName,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? DisplayName,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] bool? HasAvatar,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Biography,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? Pronouns,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] DateTimeOffset? CreatedAt
);