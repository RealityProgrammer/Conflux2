namespace Conflux.Application.Dto;

public enum AvatarOperationType {
    NoMod,
    Set,
    Delete,
}

public readonly record struct FileOperation(AvatarOperationType Type, Stream? AvatarStream);