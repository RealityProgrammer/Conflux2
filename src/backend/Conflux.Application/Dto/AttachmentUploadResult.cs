using FileSignatures;

namespace Conflux.Application.Dto;

public sealed record AttachmentUploadResult(Guid Id, FileFormat Format, string FileName);