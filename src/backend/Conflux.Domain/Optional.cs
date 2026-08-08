using Conflux.Domain.Converters;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Conflux.Domain;

[JsonConverter(typeof(OptionalConverter<>))]
public readonly struct Optional<T> : IValidatableObject {
    public static Optional<T> None => new(false, default!);
    
    public bool HasValue { get; }

    public T Value {
        get {
            return HasValue ? field : throw new InvalidOperationException("Optional has no value.");
        }
    }

    public Optional(T value) : this(true, value) { }

    private Optional(bool hasValue, T value) {
        HasValue = hasValue;
        Value = value;
    }

    public static implicit operator Optional<T>(T value) => new(true, value);

    IEnumerable<ValidationResult> IValidatableObject.Validate(ValidationContext validationContext) {
        if (!HasValue)
            yield break;

        if (Value is IValidatableObject validatable) {
            foreach (var result in validatable.Validate(validationContext)) {
                yield return result;
            }
        }
    }
}