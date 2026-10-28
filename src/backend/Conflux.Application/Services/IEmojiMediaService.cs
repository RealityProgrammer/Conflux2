using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IEmojiMediaService {
    Task<Result<MediaUploadResult>> Upload(Guid emojiId, Stream stream, CancellationToken cancellationToken = default);
    Task<Result> Delete(List<Guid> emojiIds, CancellationToken cancellationToken = default);
    string GetPreSignedUrl(Guid emojiId, TimeSpan expireIn);
}