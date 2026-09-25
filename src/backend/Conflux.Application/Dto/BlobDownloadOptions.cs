namespace Conflux.Application.Dto;

public readonly record struct BlobDownloadOptions(bool Download, string? FileName);