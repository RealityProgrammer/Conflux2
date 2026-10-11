using Conflux.Domain.Enums;
using System.Text.Json.Serialization;

namespace Conflux.Domain.Entities;

[JsonPolymorphic] 
[JsonDerivedType(typeof(CallEndProperties), typeDiscriminator: 1)]
public abstract record MessageProperties;

public sealed record CallEndProperties(
    TimeSpan Duration
) : MessageProperties;