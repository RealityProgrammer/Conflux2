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
}