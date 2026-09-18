namespace Conflux.Application.Dto;

public enum AvatarOperationType {
    NoMod,
    Set,
    Delete,
}

public readonly record struct AvatarOperation(AvatarOperationType Type, Stream? AvatarStream, string? ContentType);