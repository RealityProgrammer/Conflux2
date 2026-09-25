using Conflux.Application.Dto;
using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IBlobStorage {
    Task<Result> Upload(string key, Stream stream, string contentType, CancellationToken cancellationToken = default);
    Task<Result> Delete(string key, CancellationToken cancellationToken = default);
    Task<string> GetPreSignedUrl(string key, TimeSpan? expires = null, BlobDownloadOptions? downloadOptions = null, CancellationToken cancellationToken = default);
}