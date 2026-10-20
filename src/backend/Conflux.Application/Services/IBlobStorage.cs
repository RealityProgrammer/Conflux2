using Conflux.Domain;

namespace Conflux.Application.Services;

public interface IBlobStorage {
    Task<Result> Upload(string key, Stream stream, string contentType, CancellationToken cancellationToken = default);
    Task<Result> Delete(string key, CancellationToken cancellationToken = default);
    Task<Result> DeleteRange(IEnumerable<string> keys, CancellationToken cancellationToken = default);
    Task<Result> Copy(string from, string to, CancellationToken cancellationToken = default);
    Task<Stream?> GetStream(string key, CancellationToken cancellationToken = default);
}