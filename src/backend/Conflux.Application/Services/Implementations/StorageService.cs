using Amazon.S3;
using Amazon.S3.Model;
using Conflux.Application.Dto.Requests;
using Conflux.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Net;

namespace Conflux.Application.Services.Implementations;

public class StorageServiceOptions {
    public string AccessKey { get; set; } = null!;
    public string SecretKey { get; set; } = null!;
    public string Region { get; set; } = null!;
    public string ServiceUrl { get; set; } = null!;
    public string PreSignUrl { get; set; } = null!;
    public string BucketName { get; set; } = null!;
    public bool UseHttps { get; set; }
}

internal sealed class StorageService(
    IAmazonS3 s3Client,
    [FromKeyedServices("PreSigningClient")] IAmazonS3 preSigningClient,
    TimeProvider timeProvider,
    ILogger<StorageService> logger,
    IOptions<StorageServiceOptions> options
) : IStorageService {
    private readonly StorageServiceOptions _options = options.Value;
    
    public async Task<Result<string>> UploadUserAvatarAsync(
        Guid userId,
        UploadItem avatar,
        CancellationToken cancellationToken = default
    ) {
        string uniqueKey = CreateAvatarUniqueKey(userId);

        var result = await UploadToS3Storage(uniqueKey, avatar.Stream, avatar.ContentType, cancellationToken);

        if (result.IsSuccess) {
            return Result<string>.Success(uniqueKey);
        }

        return result.Error;
    }

    public async Task<Result> DeleteUserAvatarAsync(Guid userId, CancellationToken cancellationToken = default) {
        var uniqueKey = CreateAvatarUniqueKey(userId);
        return await DeleteFromS3Storage(uniqueKey, cancellationToken);
    }

    public string GetUserAvatarPreSignedUrl(Guid userId) {
        var uniqueKey = CreateAvatarUniqueKey(userId);

        return GetPreSignedUrl(uniqueKey, timeProvider.GetUtcNow().AddHours(1).UtcDateTime);
    }

    public async Task<Result<Guid>> UploadMessageAttachmentAsync(
        UploadItem attachment, 
        CancellationToken cancellationToken = default
    ) {
        Guid attachmentId = Guid.NewGuid();
        string key = CreateAttachmentUniqueKey(attachmentId);

        Result result = await UploadToS3Storage(key, attachment.Stream, attachment.ContentType, cancellationToken);

        if (result.IsSuccess) {
            return Result<Guid>.Success(attachmentId);
        }
        
        return result.Error;
    }

    public async Task<Result> DeleteMessageAttachmentAsync(Guid attachmentId, CancellationToken cancellationToken = default) {
        string key = CreateAttachmentUniqueKey(attachmentId);
        return await DeleteFromS3Storage(key, cancellationToken);
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
    
    public string GetMessageAttachmentPreSignedUrl(Guid attachmentId) {
        var uniqueKey = CreateAttachmentUniqueKey(attachmentId);
        return GetPreSignedUrl(uniqueKey, timeProvider.GetUtcNow().AddHours(1).UtcDateTime);
    }
    
    private string GetPreSignedUrl(string key, DateTime? expires = null) {
        var request = new GetPreSignedUrlRequest {
            BucketName = _options.BucketName,
            Key = key,
            Expires = expires,
            Protocol = _options.UseHttps ? Protocol.HTTPS : Protocol.HTTP,
        };
        
        return preSigningClient.GetPreSignedURL(request);
    }

    private static string CreateAvatarUniqueKey(Guid userId) {
        return $"avatars/users/{userId}";
    }

    private static string CreateAttachmentUniqueKey(Guid attachmentId) {
        return $"attachments/{attachmentId}";
    }
}