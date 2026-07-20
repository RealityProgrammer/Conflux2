namespace Conflux.Application;

public readonly record struct Error(string Code, string Message, object? Details = null) {
    public static Error None => new(string.Empty, string.Empty);
}