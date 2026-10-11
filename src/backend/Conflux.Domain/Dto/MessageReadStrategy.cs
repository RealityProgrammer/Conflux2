using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Conflux.Domain.Dto;

// TODO: Closed type on newer .NET version
[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(Latest), typeDiscriminator: "latest")]
[JsonDerivedType(typeof(Around), typeDiscriminator: "around")]
[JsonDerivedType(typeof(Before), typeDiscriminator: "before")]
[JsonDerivedType(typeof(After), typeDiscriminator: "after")]
public abstract record MessageReadStrategy {
    public sealed record Latest : MessageReadStrategy;
    
    public sealed record Around([Required] Guid AnchorId) : MessageReadStrategy;
    
    public sealed record Before([Required] Guid CursorId) : MessageReadStrategy;
    
    public sealed record After([Required] Guid CursorId) : MessageReadStrategy;
}