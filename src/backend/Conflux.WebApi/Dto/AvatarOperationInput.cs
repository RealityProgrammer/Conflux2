namespace Conflux.WebApi.Dto;

public enum FileOperationType {
    Set,
    NoMod,
    Delete,
}

public sealed record AvatarOperationInput(FileOperationType Type, IFormFile? File);