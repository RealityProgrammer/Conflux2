using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IEmojiMediaService {
    Task<Result<MediaUploadResult>> Upload(Guid emojiId, Stream stream, CancellationToken cancellationToken = default);
    Task<Result> Delete(Guid emojiId, CancellationToken cancellationToken = default);
}