namespace Conflux.Application.Dto;

public sealed record AttachmentMediaItemInfo(Stream Stream, string? FileName, string ContentType, int Version);