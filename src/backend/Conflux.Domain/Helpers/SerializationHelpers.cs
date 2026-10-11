using System.Text.Json;

namespace Conflux.Domain.Helpers;

public static class SerializationHelpers {
    public static bool MatchesProperty(string jsonName, string propertyName, JsonSerializerOptions options) {
        string expectedName = options.PropertyNamingPolicy?.ConvertName(propertyName) ?? propertyName;
        StringComparison comparison = options.PropertyNameCaseInsensitive 
            ? StringComparison.OrdinalIgnoreCase 
            : StringComparison.Ordinal;
            
        return string.Equals(jsonName, expectedName, comparison);
    }
}