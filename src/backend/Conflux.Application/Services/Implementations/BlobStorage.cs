using Amazon.S3;
using Amazon.S3.Model;
using Conflux.Application.Dto;
using Conflux.Application.Options;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Net;

namespace Conflux.Application.Services.Implementations;

internal sealed class StorageService(
    IAmazonS3 s3Client,
    [FromKeyedServices("PreSigningClient")] IAmazonS3 preSigningClient,
    TimeProvider timeProvider,
    ILogger<StorageService> logger,
    IOptions<StorageServiceOptions> options
) : IBlobStorage {
    private readonly StorageServiceOptions _options = options.Value;

    public async Task<Result> Upload(string key, Stream stream, string contentType, CancellationToken cancellationToken = default) {
        return await UploadToS3Storage(key, stream, contentType, cancellationToken);
    }
    
    public async Task<Result> Delete(string key, CancellationToken cancellationToken = default) {
        return await DeleteFromS3Storage(key, cancellationToken);
    }

    public async Task<string> GetPreSignedUrl(
        string key, 
        TimeSpan? expires = null, 
        BlobDownloadOptions? downloadOptions = null, 
        CancellationToken cancellationToken = default
    ) {
        var request = CreatePreSignedUrlRequest(key, expires == null ? null : timeProvider.GetUtcNow().Add(expires.Value).UtcDateTime);
        
        if (downloadOptions is { Download: true }) {
            string? fileName = downloadOptions.Value.FileName;
            request.ResponseHeaderOverrides.ContentDisposition = string.IsNullOrWhiteSpace(fileName) ? "attachment" : $"attachment; filename=\"{fileName}\"";
        }
        
        return await preSigningClient.GetPreSignedURLAsync(request);
    }

    private GetPreSignedUrlRequest CreatePreSignedUrlRequest(string key, DateTime? expires) {
        return new() {
            BucketName = _options.BucketName,
            Key = key,
            Expires = expires,
            Protocol = _options.UseHttps ? Protocol.HTTPS : Protocol.HTTP,
        };
    }
    
    private async Task<Result> UploadToS3Storage(
        string key,
        Stream stream,
        string contentType,
        CancellationToken cancellationToken = default
    ) {
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
        } catch (AmazonS3Exception e) {
            logger.LogError(e, "S3 threw exception.");
            return Errors.UnexpectedError();
        } catch (HttpRequestException e) {
            switch (e.HttpRequestError) {
                case HttpRequestError.ConnectionError:
                    return Errors.ConnectionFailure("S3");

                default:
                    logger.LogError(e, "S3 threw exception.");
                    return Errors.UnexpectedError();

            }
        } catch (Exception e) {
            logger.LogError(e, "S3 threw exception.");
            return Errors.UnexpectedError();
        }
    }

    private async Task<Result> DeleteFromS3Storage(string uniqueKey, CancellationToken cancellationToken = default) {
        try {
            var response = await s3Client.DeleteObjectAsync(_options.BucketName, uniqueKey, cancellationToken);

            switch (response.HttpStatusCode) {
                case HttpStatusCode.OK or HttpStatusCode.NoContent:
                    return Result.Success();
                
                case HttpStatusCode.NotFound:
                    return Errors.ResourceNotFound();
                
                default:
                    logger.LogWarning("Unhandled S3 response status code {c}.", response.HttpStatusCode);
                    return Errors.UnexpectedError();
            }
        } catch (AmazonS3Exception e) {
            logger.LogError(e, "S3 threw exception.");
            return Errors.UnexpectedError();
        } catch (HttpRequestException e) {
            switch (e.HttpRequestError) {
                case HttpRequestError.ConnectionError:
                    return Errors.ConnectionFailure("S3");

                default:
                    logger.LogError(e, "S3 threw exception.");
                    return Errors.UnexpectedError();
            }
        } catch (Exception e) {
            logger.LogError(e, "S3 threw exception.");
            return Errors.UnexpectedError();
        }
    }
}