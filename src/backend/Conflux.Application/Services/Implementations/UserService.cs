using Amazon.S3;
using Amazon.S3.Model;
using Conflux.Application.Responses;
using Conflux.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Net;

namespace Conflux.Application.Services.Implementations;

internal sealed class UserService(
    IAmazonS3 s3Client,
    IDbContextFactory<ApplicationDbContext> dbContextFactory,
    IConfiguration config
) : IUserService {
    public async Task<Result<AvatarUploadResponse>> UploadAvatarAsync(string userId, Stream avatarStream, string contentType) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        // begin writing transaction, if s3 upload fail, rollback.
        await using var transaction = await dbContext.Database.BeginTransactionAsync();
        
        var bucketName = config["MediaAWS:BucketName"];
        var uniqueKey = $"avatars/users/{userId}";
        
        int changed = await dbContext.Users
            .Where(u => u.Id == Guid.Parse(userId))
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
                    "User.UploadAvatar.UnknownStatusCode",
                    $"S3 response with status code {response.HttpStatusCode} ({(int)response.HttpStatusCode})."
                );
        }
    }
}