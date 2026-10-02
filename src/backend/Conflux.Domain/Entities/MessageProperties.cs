using Conflux.Domain.Enums;
using System.Text.Json.Serialization;

namespace Conflux.Domain.Entities;

[JsonPolymorphic] 
[JsonDerivedType(typeof(CallProperties), typeDiscriminator: 1)]
public abstract record MessageProperties;

public sealed record CallProperties(
    CallEventType Type, 
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] TimeSpan? Duration
) : MessageProperties;