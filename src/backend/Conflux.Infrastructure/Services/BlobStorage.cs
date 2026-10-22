using Amazon.S3;
using Amazon.S3.Model;
using Conflux.Application.Options;
using Conflux.Application.Services;
using Conflux.Domain;
using Microsoft.Extensions.Options;
using System.Collections.ObjectModel;
using System.Net;

namespace Conflux.Infrastructure.Services;

internal sealed class StorageService(
    IAmazonS3 s3Client,
    ILogger<StorageService> logger,
    IOptions<S3Options> options
) : IBlobStorage {
    private readonly S3Options _options = options.Value;

    public async Task<Result> Upload(string key, Stream stream, string contentType, CancellationToken cancellationToken = default) {
        var uploadRequest = new PutObjectRequest {
            InputStream = stream,
            BucketName = _options.BucketName,
            Key = key,
            ContentType = contentType,
            UseChunkEncoding = false,
        };
        
        try {
            PutObjectResponse response = await s3Client.PutObjectAsync(uploadRequest, cancellationToken);

            switch (response.HttpStatusCode) {
                case HttpStatusCode.OK or HttpStatusCode.Created:
                    return Result.Success();

                case HttpStatusCode.Unauthorized:
                    return Errors.InvalidCredentials("S3");

                case HttpStatusCode.ServiceUnavailable:
                    return Errors.ConnectionFailure("S3");

                case HttpStatusCode.MethodNotAllowed:
                    return Errors.Discontinued("S3 no longer support Email Grantee ACLs.");

                default:
                    logger.LogWarning("Unhandled S3 response status code {c}.", response.HttpStatusCode);
                    return Errors.UnexpectedError();
            }
        } catch (HttpRequestException e) when (e.HttpRequestError == HttpRequestError.ConnectionError) {
            return Errors.ConnectionFailure("S3");
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while uploading file to S3.");
            return Errors.UnexpectedError();
        }
    }
    
    public async Task<Result> Delete(string key, CancellationToken cancellationToken = default) {
        try {
            await s3Client.DeleteObjectAsync(_options.BucketName, key, cancellationToken);
            return Result.Success();
        } catch (HttpRequestException e) when (e.HttpRequestError == HttpRequestError.ConnectionError) {
            return Errors.ConnectionFailure("S3");
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while deleting file from S3.");
            return Errors.UnexpectedError();
        }
    }

    public async Task<Result> DeleteRange(IEnumerable<string> keys, CancellationToken cancellationToken = default) {
        foreach (var batch in keys.Chunk(1000)) {
            var deleteRequest = new DeleteObjectsRequest {
                BucketName = _options.BucketName,
                Objects = [..batch.Select(k => new KeyVersion { Key = k })],
            };

            try {
                var response = await s3Client.DeleteObjectsAsync(deleteRequest, cancellationToken);

                if (response.DeleteErrors is { Count: > 0 }) {
                    bool anyCriticalError = response.DeleteErrors
                        .Any(e => e.Code != "NoSuchKey" && e.Code != "NotFound");

                    if (anyCriticalError) {
                        return Errors.StorageError("Failed to delete some objects due to server errors.");
                    }
                }
            } catch (DeleteObjectsException ex) {
                bool anyCriticalError = ex.Response.DeleteErrors
                    .Any(e => e.Code != "NoSuchKey" && e.Code != "NotFound");

                if (anyCriticalError) {
                    return Errors.StorageError("Failed to delete some objects due to server errors.", ex.Message);
                }
            } catch (AmazonS3Exception ex) when (ex.ErrorCode is "NoSuchKey" or "NotFound" || ex.StatusCode == HttpStatusCode.NotFound) {
                // swallow if the whole request failed because the files didn't exist
            } catch (OperationCanceledException) {
                throw;
            } catch (HttpRequestException e) when (e.HttpRequestError == HttpRequestError.ConnectionError) {
                return Errors.ConnectionFailure("S3");
            } catch (Exception e) {
                logger.LogError(e, "Exception thrown while deleting file from S3.");
                return Errors.UnexpectedError();
            }
        }

        return Result.Success();
    }

    public async Task<Result> Copy(string from, string to, CancellationToken cancellationToken = default) {
        try {
            await s3Client.CopyObjectAsync(_options.BucketName, from, _options.BucketName, to, cancellationToken);
            return Result.Success();
        } catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound || ex.ErrorCode == "NoSuchKey") {
            return Errors.FileNotExists(from);
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while copying file in S3.");
            return Errors.UnexpectedError();
        }
    }

    public async Task<Stream?> GetStream(string key, CancellationToken cancellationToken = default) {
        try {
            return await s3Client.GetObjectStreamAsync(_options.BucketName, key, ReadOnlyDictionary<string, object>.Empty, cancellationToken);
        } catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound) {
            return null;
        }
    }
}