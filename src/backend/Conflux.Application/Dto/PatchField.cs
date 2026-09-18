using Conflux.Application.Converters;
using System.Text.Json.Serialization;

namespace Conflux.Application.Dto;

[JsonConverter(typeof(PatchFieldConverterFactory))]
public readonly struct PatchField<T> {
    public T? Value { get; }
    public bool IsSet { get; }

    public PatchField(T? value, bool isSet) {
        Value = value;
        IsSet = isSet;
    }
}