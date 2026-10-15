using Facet;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Conflux.Application.Converters;

internal sealed class OptionalConverterFactory : JsonConverterFactory {
    public override bool CanConvert(Type typeToConvert) =>
        typeToConvert.IsGenericType && typeToConvert.GetGenericTypeDefinition() == typeof(Optional<>);

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options) {
        var valueType = typeToConvert.GetGenericArguments()[0];
        var converterType = typeof(OptionalConverterFactory<>).MakeGenericType(valueType);
        
        return (JsonConverter)Activator.CreateInstance(converterType)!;
    }
}

public sealed class OptionalConverterFactory<T> : JsonConverter<Optional<T>> {
    public override bool HandleNull => true;

    public override Optional<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) {
        if (reader.TokenType == JsonTokenType.Null) {
            return new(default!);
        }

        var value = JsonSerializer.Deserialize<T>(ref reader, options);
        return new(value!);
    }

    public override void Write(Utf8JsonWriter writer, Optional<T> value, JsonSerializerOptions options) {
        if (!value.HasValue) {
            writer.WriteNullValue();
        } else {
            JsonSerializer.Serialize(writer, value.Value, options);
        }
    }
}