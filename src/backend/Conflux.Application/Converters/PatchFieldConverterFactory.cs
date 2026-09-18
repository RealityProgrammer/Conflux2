using Conflux.Application.Dto;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Conflux.Application.Converters;

internal sealed class PatchFieldConverterFactory : JsonConverterFactory {
    public override bool CanConvert(Type typeToConvert) =>
        typeToConvert.IsGenericType && typeToConvert.GetGenericTypeDefinition() == typeof(PatchField<>);

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options) {
        var valueType = typeToConvert.GetGenericArguments()[0];
        var converterType = typeof(PatchFieldConverterFactory<>).MakeGenericType(valueType);
        return (JsonConverter)Activator.CreateInstance(converterType)!;
    }
}

public sealed class PatchFieldConverterFactory<T> : JsonConverter<PatchField<T>> {
    public override bool HandleNull => true;

    public override PatchField<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) {
        if (reader.TokenType == JsonTokenType.Null) {
            return new(default, true);
        }

        var value = JsonSerializer.Deserialize<T>(ref reader, options);
        return new(value, true);
    }

    public override void Write(Utf8JsonWriter writer, PatchField<T> value, JsonSerializerOptions options) {
        throw new NotImplementedException();
    }
}