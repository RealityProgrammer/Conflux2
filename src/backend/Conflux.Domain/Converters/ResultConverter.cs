using Conflux.Domain.Helpers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Conflux.Domain.Converters;

internal sealed class ResultJsonConverterFactory : JsonConverterFactory {
    public override bool CanConvert(Type typeToConvert) {
        if (typeToConvert == typeof(Result))
            return true;

        return typeToConvert.IsGenericType && typeToConvert.GetGenericTypeDefinition() == typeof(Result<>);
    }

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options) {
        if (typeToConvert == typeof(Result)) {
            return new ResultConverter();
        }

        Type valueType = typeToConvert.GetGenericArguments()[0];
        Type converterType = typeof(ResultConverter<>).MakeGenericType(valueType);

        return (JsonConverter)Activator.CreateInstance(converterType)!;
    }
}

internal sealed class ResultConverter : JsonConverter<Result> {
    public override Result Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) {
        if (reader.TokenType != JsonTokenType.StartObject) {
            throw new JsonException();
        }

        bool isSuccess = false;
        Error error = default!;

        while (reader.Read()) {
            if (reader.TokenType == JsonTokenType.EndObject) {
                return new(isSuccess, error);
            }
            
            if (reader.TokenType != JsonTokenType.PropertyName) {
                throw new JsonException("Expected PropertyName token.");
            }

            string propertyName = reader.GetString()!;
            reader.Read();

            if (SerializationHelpers.MatchesProperty(propertyName, nameof(Result.IsSuccess), options)) {
                isSuccess = reader.GetBoolean();
            } else if (SerializationHelpers.MatchesProperty(propertyName, nameof(Result.Error), options)) {
                error = JsonSerializer.Deserialize<Error>(ref reader, options)!;
            } else {
                reader.Skip();
            }
        }
        
        return isSuccess ? Result.Success() : Result.Failure(error);
    }
    
    public override void Write(Utf8JsonWriter writer, Result value, JsonSerializerOptions options) {
        writer.WriteStartObject();

        var namingPolicy = options.PropertyNamingPolicy;

        writer.WriteBoolean(
            namingPolicy?.ConvertName(nameof(Result.IsSuccess)) ?? nameof(Result.IsSuccess), 
            value.IsSuccess
        );

        if (!value.IsSuccess) {
            writer.WritePropertyName(namingPolicy?.ConvertName(nameof(Result.Error)) ?? nameof(Result.Error));
            JsonSerializer.Serialize(writer, value.Error, options);
        }

        writer.WriteEndObject();
    }
}

internal sealed class ResultConverter<T> : JsonConverter<Result<T>> {
    public override Result<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options) {
        if (reader.TokenType != JsonTokenType.StartObject) {
            throw new JsonException("Expected StartObject token.");
        }

        bool isSuccess = false;
        T? value = default;
        Error error = default!;

        while (reader.Read()) {
            if (reader.TokenType == JsonTokenType.EndObject) break;

            if (reader.TokenType != JsonTokenType.PropertyName) {
                throw new JsonException("Expected PropertyName token.");
            }

            string propertyName = reader.GetString()!;
            reader.Read();

            if (MatchesProperty(propertyName, nameof(Result<>.IsSuccess), options)) {
                isSuccess = reader.GetBoolean();
            } else if (MatchesProperty(propertyName, nameof(Result<>.Value), options)) {
                value = JsonSerializer.Deserialize<T>(ref reader, options);
            } else if (MatchesProperty(propertyName, nameof(Result<>.Error), options)) {
                error = JsonSerializer.Deserialize<Error>(ref reader, options)!;
            } else {
                reader.Skip();
            }
        }

        return isSuccess ? Result<T>.Success(value!) : Result<T>.Failure(error);
    }

    public override void Write(Utf8JsonWriter writer, Result<T> value, JsonSerializerOptions options) {
        writer.WriteStartObject();

        var namingPolicy = options.PropertyNamingPolicy;

        writer.WriteBoolean(
            namingPolicy?.ConvertName(nameof(Result<>.IsSuccess)) ?? nameof(Result<T>.IsSuccess),
            value.IsSuccess);

        if (value.IsSuccess) {
            writer.WritePropertyName(namingPolicy?.ConvertName(nameof(Result<>.Value)) ?? nameof(Result<>.Value));
            JsonSerializer.Serialize(writer, value.Value, options);
        } else {
            writer.WritePropertyName(namingPolicy?.ConvertName(nameof(Result<>.Error)) ?? nameof(Result<>.Error));
            JsonSerializer.Serialize(writer, value.Error, options);
        }

        writer.WriteEndObject();
    }

    private static bool MatchesProperty(string jsonName, string propertyName, JsonSerializerOptions options) {
        string expectedName = options.PropertyNamingPolicy?.ConvertName(propertyName) ?? propertyName;
        StringComparison comparison = options.PropertyNameCaseInsensitive ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;

        return string.Equals(jsonName, expectedName, comparison);
    }
}