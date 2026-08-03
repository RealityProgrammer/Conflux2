using Amazon.S3;
using Amazon.S3.Model;
using Conflux.Application.Dto.Requests;
using Conflux.Domain;
using Microsoft.Extensions.Configuration;
using System.Net;

namespace Conflux.Application.Interfaces.Implementations;

internal sealed class StorageService(
    IAmazonS3 s3Client,
    IConfiguration config,
    TimeProvider timeProvider,
    ILogger<StorageService> logger
) : IStorageService {
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

    public string GetUserAvatarPreSignedUrl(Guid userId, bool useHttps) {
        var bucketName = config["MediaAWS:BucketName"];
        var uniqueKey = CreateAvatarUniqueKey(userId);

        var request = new GetPreSignedUrlRequest {
            BucketName = bucketName,
            Key = uniqueKey,
            Expires = timeProvider.GetUtcNow().AddHours(1).DateTime,
            Protocol = useHttps ? Protocol.HTTPS : Protocol.HTTP,
        };
        
        return s3Client.GetPreSignedURL(request);
    }

    public async Task<Result<List<Guid>>> UploadMessageAttachmentsAsync(
        IEnumerable<UploadItem> attachments, 
        CancellationToken cancellationToken = default
    ) {
        List<Guid> outputs = [];
        
        foreach (var attachment in attachments) {
            Guid attachmentId = Guid.NewGuid();
            string key = CreateAttachmentUniqueKey(attachmentId);

            Result result = await UploadToS3Storage(key, attachment.Stream, attachment.ContentType, cancellationToken);

            if (result.IsSuccess) {
                outputs.Add(attachmentId);
            } else {
                // shit got wrecked, delete uploaded and bail out early.
                foreach (var uploadedAttachmentId in outputs) {
                    key = CreateAttachmentUniqueKey(uploadedAttachmentId);
                    await DeleteFromS3Storage(key, CancellationToken.None);
                }

                return Errors.AttachmentUploadFailure();
            }
        }

        return Result<List<Guid>>.Success(outputs);
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
        var bucketName = config["MediaAWS:BucketName"];
        
        var uploadRequest = new PutObjectRequest {
            InputStream = stream,
            BucketName = bucketName,
            Key = key,
            ContentType = contentType,
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
        var bucketName = config["MediaAWS:BucketName"];
        
        try {
            var response = await s3Client.DeleteObjectAsync(bucketName, uniqueKey, cancellationToken);

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
    
    public string GetMessageAttachmentPreSignedUrl(Guid attachmentId, bool useHttps) {
        var bucketName = config["MediaAWS:BucketName"];
        var uniqueKey = CreateAttachmentUniqueKey(attachmentId);

        var request = new GetPreSignedUrlRequest {
            BucketName = bucketName,
            Key = uniqueKey,
            Expires = timeProvider.GetUtcNow().AddHours(1).DateTime,
            Protocol = useHttps ? Protocol.HTTPS : Protocol.HTTP,
        };
        
        return s3Client.GetPreSignedURL(request);
    }

    private static string CreateAvatarUniqueKey(Guid userId) {
        return $"avatars/users/{userId}";
    }

    private static string CreateAttachmentUniqueKey(Guid attachmentId) {
        return $"attachments/{attachmentId}";
    }
}