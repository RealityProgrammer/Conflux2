namespace Conflux.Application.Dto;

public readonly record struct UploadFile(string FileName, Stream Stream);