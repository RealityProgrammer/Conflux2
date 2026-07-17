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
    IConfiguration config
) : IUserService {
    public async Task<Result<AvatarUploadResponse>> UploadAvatarAsync(Guid userId, Stream avatarStream, string contentType) {
        if (avatarStream.CanSeek && avatarStream.Position > 0) {
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
                setters.SetProperty(u => u.AvatarKey, uniqueKey);
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
                    $"S3 response with status code {response.HttpStatusCode} ({(int)response.HttpStatusCode})."
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
                _ => Result<OpenAvatarResponse>.Failure("User.OpenAvatar.StatusCode", $"S3 returned response with status code {e.StatusCode} ({(int)e.StatusCode}).")
            };
        }
    }

    private static string CreateAvatarUniqueKey(Guid userId) {
        return $"avatars/users/{userId}";
    }
}