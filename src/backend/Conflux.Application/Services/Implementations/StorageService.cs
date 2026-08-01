using Amazon.S3;
using Amazon.S3.Model;
using Conflux.Domain;
using Microsoft.Extensions.Configuration;
using System.Net;

namespace Conflux.Application.Services.Implementations;

internal sealed class StorageService(
    IAmazonS3 s3Client,
    IConfiguration config,
    TimeProvider timeProvider,
    ILogger<StorageService> logger
) : IStorageService {
    public async Task<Result<string>> UploadUserAvatarAsync(
        Guid userId,
        Stream stream, 
        string contentType,
        CancellationToken cancellationToken = default
    ) {
        var bucketName = config["MediaAWS:BucketName"];
        string uniqueKey = CreateAvatarUniqueKey(userId);
        
        var uploadRequest = new PutObjectRequest {
            InputStream = stream,
            BucketName = bucketName,
            Key = uniqueKey,
            ContentType = contentType,
        };

        try {
            PutObjectResponse response = await s3Client.PutObjectAsync(uploadRequest, cancellationToken);

            switch (response.HttpStatusCode) {
                case HttpStatusCode.OK or HttpStatusCode.Created:
                    return Result<string>.Success(uniqueKey);

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
        }
    }

    public async Task<Result> DeleteUserAvatarAsync(Guid userId, CancellationToken cancellationToken = default) {
        var bucketName = config["MediaAWS:BucketName"];
        var uniqueKey = CreateAvatarUniqueKey(userId);
        
        try {
            var response = await s3Client.DeleteObjectAsync(bucketName, uniqueKey, cancellationToken);

            switch (response.HttpStatusCode) {
                case HttpStatusCode.OK or HttpStatusCode.NoContent:
                    return Result.Success();
                
                case HttpStatusCode.NotFound:
                    return Errors.ResourceNotFound("Avatar");
                
                default:
                    logger.LogWarning("Unhandled S3 response status code {c}.", response.HttpStatusCode);
                    return Errors.UnexpectedError();
            }
        } catch (Exception e) {
            logger.LogError(e, "S3 threw exception.");
            return Errors.UnexpectedError();
        }
    }

    public Result<string> GetUserAvatarUrl(Guid userId, bool useHttps) {
        var bucketName = config["MediaAWS:BucketName"];
        var uniqueKey = CreateAvatarUniqueKey(userId);

        var request = new GetPreSignedUrlRequest {
            BucketName = bucketName,
            Key = uniqueKey,
            Expires = timeProvider.GetUtcNow().AddHours(1).DateTime,
            Protocol = useHttps ? Protocol.HTTPS : Protocol.HTTP,
        };
        
        return Result<string>.Success(s3Client.GetPreSignedURL(request));
    }

    private static string CreateAvatarUniqueKey(Guid userId) {
        return $"avatars/users/{userId}";
    }
}