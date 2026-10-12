using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Entities;

namespace Conflux.Application.Services;

public interface IMessageMediaService {
    Task<Result<MediaItem>> UploadAttachment(Stream stream, string fileName, CancellationToken cancellationToken = default);
    Task<Result> DeleteAttachment(Guid attachmentId, CancellationToken cancellationToken = default);

    Task<AttachmentMediaItemInfo?> GetAttachment(Guid attachmentId, CancellationToken cancellationToken = default);
}