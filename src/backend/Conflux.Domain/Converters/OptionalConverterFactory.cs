using System.Text.Json;
using System.Text.Json.Serialization;

namespace Conflux.Domain.Converters;

public sealed class OptionalConverter<T> : JsonConverter<Optional<T>> {
    public override bool HandleNull => true;
    
    public override Optional<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) {
        if (reader.TokenType == JsonTokenType.Null) {
            return new(default!);
        }

        return new(JsonSerializer.Deserialize<T>(ref reader, options)!);
    }

    public override void Write(Utf8JsonWriter writer, Optional<T> value, JsonSerializerOptions options) {
        if (value.HasValue) {
            JsonSerializer.Serialize(writer, value.Value, options);
        }
    }
}