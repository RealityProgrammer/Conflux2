using Conflux.Domain.Converters;
using System.Text.Json.Serialization;

namespace Conflux.Domain;

[JsonConverter(typeof(ErrorConverter))]
public readonly record struct Error(
    string Code, 
    string Message,
    object? Details = null
) {
    public static Error None => new(string.Empty, string.Empty);
}