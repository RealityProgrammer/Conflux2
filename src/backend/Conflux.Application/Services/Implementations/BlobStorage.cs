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
    IOptions<StorageServiceOptions> options,
    IMessageRepository messageRepository
) : IBlobStorage, IBlobUrlProvider {
    private readonly StorageServiceOptions _options = options.Value;
    
    public async Task<Result<string>> UploadUserAvatar(
        Guid userId,
        UploadItem avatar,
        CancellationToken cancellationToken = default
    ) {
        string uniqueKey = CreateUserAvatarUniqueKey(userId);

        var result = await UploadToS3Storage(uniqueKey, avatar.Stream, avatar.ContentType, cancellationToken);

        if (result.IsSuccess) {
            return Result<string>.Success(uniqueKey);
        }

        return result.Error;
    }

    public async Task<Result> DeleteUserAvatar(Guid userId, CancellationToken cancellationToken = default) {
        var uniqueKey = CreateUserAvatarUniqueKey(userId);
        return await DeleteFromS3Storage(uniqueKey, cancellationToken);
    }

    public string GetUserAvatarPreSignedUrl(Guid userId) {
        var uniqueKey = CreateUserAvatarUniqueKey(userId);

        return GetPreSignedUrl(uniqueKey, timeProvider.GetUtcNow().AddHours(1).UtcDateTime);
    }

    public async Task<Result<Guid>> UploadMessageAttachment(
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

    public async Task<Result> DeleteMessageAttachment(Guid attachmentId, CancellationToken cancellationToken = default) {
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
    
    public async Task<Result<string>> GetMessageAttachmentPreSignedUrl(Guid attachmentId, bool download) {
        var request = new GetPreSignedUrlRequest {
            BucketName = _options.BucketName,
            Key = CreateAttachmentUniqueKey(attachmentId),
            Expires = timeProvider.GetUtcNow().AddHours(1).UtcDateTime,
            Protocol = _options.UseHttps ? Protocol.HTTPS : Protocol.HTTP,
        };

        if (download) {
            Attachment? attachment = await messageRepository.GetAttachmentById(attachmentId, CancellationToken.None);

            if (attachment == null) {
                return Errors.ResourceNotFound($"Attachment (Id = {attachment})");
            }

            string fileName = string.IsNullOrEmpty(attachment.Name) ? "file" : attachment.Name;
            request.ResponseHeaderOverrides.ContentDisposition = $"attachment; filename=\"{fileName}\"";
        }

        // probably no need to try-catch since it only throws Arguments related exceptions.
        string preSignedUrl = await preSigningClient.GetPreSignedURLAsync(request);
        return Result<string>.Success(preSignedUrl);
    }

    public async Task<Result<string>> UploadCommunityServerAvatar(
        Guid communityServerId, 
        UploadItem avatar, 
        CancellationToken cancellationToken = default
    ) {
        string uniqueKey = CreateCommunityServerAvatarUniqueKey(communityServerId);

        var result = await UploadToS3Storage(uniqueKey, avatar.Stream, avatar.ContentType, cancellationToken);

        if (result.IsSuccess) {
            return Result<string>.Success(uniqueKey);
        }

        return result.Error;
    }

    public string GetCommunityServerAvatarPreSignedUrl(Guid serverId) {
        var uniqueKey = CreateCommunityServerAvatarUniqueKey(serverId);
        return GetPreSignedUrl(uniqueKey, timeProvider.GetUtcNow().AddHours(1).UtcDateTime);
    }
    
    private string GetPreSignedUrl(string key, DateTime? expires) {
        var request = new GetPreSignedUrlRequest {
            BucketName = _options.BucketName,
            Key = key,
            Expires = expires,
            Protocol = _options.UseHttps ? Protocol.HTTPS : Protocol.HTTP,
        };

        return preSigningClient.GetPreSignedURL(request);
    }

    private static string CreateUserAvatarUniqueKey(Guid userId) {
        return $"users/{userId}/avatar";
    }
    
    private static string CreateCommunityServerAvatarUniqueKey(Guid userId) {
        return $"servers/{userId}/avatar";
    }

    private static string CreateAttachmentUniqueKey(Guid attachmentId) {
        return $"attachments/{attachmentId}";
    }
}