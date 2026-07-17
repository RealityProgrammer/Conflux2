using Amazon.S3;
using Amazon.S3.Model;
using Conflux.Application.Responses;
using Conflux.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Net;

namespace Conflux.Application.Services.Implementations;

internal sealed class UserService(
    IAmazonS3 s3Client,
    IDbContextFactory<ApplicationDbContext> dbContextFactory,
    TimeProvider timeProvider,
    IConfiguration config
) : IUserService {
    public async Task<Result<AvatarUploadResponse>> UploadAvatarAsync(Guid userId, Stream avatarStream, string contentType) {
        if (avatarStream is { CanSeek: true, Position: > 0 }) {
            avatarStream.Position = 0;
        }
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        // begin writing transaction, if s3 upload fail, rollback.
        await using var transaction = await dbContext.Database.BeginTransactionAsync();
        
        var bucketName = config["MediaAWS:BucketName"];
        var uniqueKey = CreateAvatarUniqueKey(userId);
        
        int changed = await dbContext.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(setters => {
                setters.SetProperty(u => u.AvatarUpdatedAt, timeProvider.GetUtcNow());
            });

        if (changed == 0) {
            return Result<AvatarUploadResponse>.Failure("User.NoId", "No user with the provided ID.");
        }
        
        var uploadRequest = new PutObjectRequest {
            InputStream = avatarStream,
            BucketName = bucketName,
            Key = uniqueKey,
            ContentType = contentType,
        };
        
        // try catch exception?

        PutObjectResponse response = await s3Client.PutObjectAsync(uploadRequest);

        switch (response.HttpStatusCode) {
            case HttpStatusCode.OK or HttpStatusCode.Created:
                // commit transaction, should be fine here
                await transaction.CommitAsync();
                
                return Result<AvatarUploadResponse>.Success(new(uniqueKey));

            // errors or unhandled status codes, rollback transaction.
            case HttpStatusCode.Unauthorized:
                await transaction.RollbackAsync();
                
                return Result<AvatarUploadResponse>.Failure(
                    "User.UploadAvatar.Authorize",
                    "Cannot upload avatar to S3 service due to authorization issue."
                );
            
            case HttpStatusCode.ServiceUnavailable:
                await transaction.RollbackAsync();
                
                return Result<AvatarUploadResponse>.Failure(
                    "User.UploadAvatar.ServiceUnavailable",
                    "Cannot upload avatar to S3 service."
                );

            case HttpStatusCode.MethodNotAllowed:
                await transaction.RollbackAsync();
                return Result<AvatarUploadResponse>.Failure(
                    "User.UploadAvatar.MethodNotAllowed",
                    "Method is not allowed (Potentially using discontinued supports for Email Grantee ACLs)."
                );

            default:
                await transaction.RollbackAsync();
                
                return Result<AvatarUploadResponse>.Failure(
                    "User.UploadAvatar.StatusCode",
                    GetUnhandledS3ResponseStatusCodeMessage(response.HttpStatusCode)
                );
        }
    }

    public async Task<Result<OpenAvatarResponse>> OpenAvatarAsync(Guid userId) {
        var bucketName = config["MediaAWS:BucketName"];
        var uniqueKey = CreateAvatarUniqueKey(userId);

        try {
            var response = await s3Client.GetObjectAsync(bucketName, uniqueKey);

            return Result<OpenAvatarResponse>.Success(new(
                response.ResponseStream,
                response.Headers.ContentType,
                response
            ));
        } catch (AmazonS3Exception e) {
            return e.StatusCode switch {
                HttpStatusCode.NotFound => Result<OpenAvatarResponse>.Failure("User.OpenAvatar.NotFound", "User has no avatar."),
                _ => Result<OpenAvatarResponse>.Failure("User.OpenAvatar.StatusCode", GetUnhandledS3ResponseStatusCodeMessage(e.StatusCode)),
            };
        }
    }

    public Result<string> GetAvatarUrl(Guid userId, bool useHttps) {
        var bucketName = config["MediaAWS:BucketName"];
        var uniqueKey = CreateAvatarUniqueKey(userId);

        try {
            var request = new GetPreSignedUrlRequest {
                BucketName = bucketName,
                Key = uniqueKey,
                Expires = DateTime.UtcNow.AddHours(1),
                Protocol = useHttps ? Protocol.HTTPS : Protocol.HTTP,
            };

            string url = s3Client.GetPreSignedURL(request);
            return Result<string>.Success(url);
        } catch (Exception ex) {
            return Result<string>.Failure("User.GetAvatarUrl", ex.Message);
        }
    }

    public async Task<Result> DeleteAvatarAsync(Guid userId) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        // begin writing transaction, if s3 upload fail, rollback.
        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        int changed = await dbContext.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(setters => {
                setters.SetProperty(u => u.AvatarUpdatedAt, timeProvider.GetUtcNow());
            });

        if (changed == 0) {
            return Result.Failure("User.NoId", "No user with the provided ID.");
        }
        
        var bucketName = config["MediaAWS:BucketName"];
        var uniqueKey = CreateAvatarUniqueKey(userId);
        
        try {
            var response = await s3Client.DeleteObjectAsync(bucketName, uniqueKey);

            switch (response.HttpStatusCode) {
                case HttpStatusCode.OK or HttpStatusCode.NoContent:
                    await transaction.CommitAsync();
                    return Result.Success();
                
                case HttpStatusCode.NotFound:
                    await transaction.RollbackAsync();
                    return Result.Failure("User.DeleteAvatar.NotFound", "User has no avatar.");
                
                default:
                    await transaction.RollbackAsync();
                    return Result.Failure("User.DeleteAvatar", GetUnhandledS3ResponseStatusCodeMessage(response.HttpStatusCode));
            }
        } catch (Exception ex) {
            await transaction.RollbackAsync();
            return Result.Failure("User.DeleteAvatar", ex.Message);
        }
    }

    private static string CreateAvatarUniqueKey(Guid userId) {
        return $"avatars/users/{userId}";
    }

    private static string GetUnhandledS3ResponseStatusCodeMessage(HttpStatusCode code) {
        return $"S3 response with status code {code} ({(int)code}).";
    }
}