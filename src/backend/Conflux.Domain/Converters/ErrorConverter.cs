using System.Text.Json;
using System.Text.Json.Serialization;

namespace Conflux.Domain.Converters;

public sealed class ErrorConverter : JsonConverter<Error> {
    public override Error Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) {
        if (reader.TokenType != JsonTokenType.StartObject) {
            throw new JsonException();
        }

        string code = string.Empty, message = string.Empty;
        object? details = null;

        while (reader.Read()) {
            if (reader.TokenType == JsonTokenType.EndObject) {
                return new(code, message, details);
            }

            if (reader.TokenType == JsonTokenType.PropertyName) {
                string propertyName = reader.GetString()!;
                reader.Read();
                
                switch (propertyName) {
                    case "code" or "Code":
                        code = reader.GetString()!;
                        break;

                    case "description" or "Description":
                        message = reader.GetString()!;
                        break;

                    case "details" or "Details":
                        details = JsonSerializer.Deserialize<object>(ref reader, options);
                        break;
                }
            }
        }

        throw new JsonException();
    }

    public override void Write(Utf8JsonWriter writer, Error value, JsonSerializerOptions options) {
        writer.WriteStartObject();
        
        if (!string.IsNullOrEmpty(value.Code)) {
            writer.WritePropertyName(options.PropertyNamingPolicy?.ConvertName(nameof(Error.Code)) ?? nameof(Error.Code));
            writer.WriteStringValue(value.Code);

            if (!string.IsNullOrEmpty(value.Message)) {
                writer.WritePropertyName(options.PropertyNamingPolicy?.ConvertName(nameof(Error.Message)) ?? nameof(Error.Message));
                writer.WriteStringValue(value.Code);
            }

            if (value.Details != null) {
                writer.WritePropertyName(options.PropertyNamingPolicy?.ConvertName(nameof(Error.Details)) ?? nameof(Error.Details));
                JsonSerializer.Serialize(writer, value.Details, options);
            }
        }
        
        writer.WriteEndObject();
    }
}