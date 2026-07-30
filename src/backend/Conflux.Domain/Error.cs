using System.Text.Json.Serialization;

namespace Conflux.Domain;

public readonly record struct Error(
    string Code, 
    string Message,
    
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    object? Details = null
) {
    public static Error None => new(string.Empty, string.Empty);
}