namespace Conflux.Application.Requests;

public enum AvatarOperationType {
    NoMod,
    Set,
    Delete,
}

public readonly record struct AvatarOperation(AvatarOperationType Type, Stream? AvatarStream, string? ContentType);