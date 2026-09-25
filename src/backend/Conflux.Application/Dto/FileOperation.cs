namespace Conflux.Application.Dto;

public enum FileOperationType {
    NoMod,
    Set,
    Delete,
}

public readonly record struct FileOperation(FileOperationType Type, Stream? Stream);