using Amazon.S3;
using Amazon.S3.Model;
using Conflux.Application.Requests;
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
    TimeProvider timeProvider,
    UserManager<ApplicationUser> userManager,
    IConfiguration config,
    ILogger<UserService> logger
) : IUserService {
    public async Task<Result<AvatarUploadResponse>> UploadAvatarAsync(Guid userId, Stream avatarStream, string contentType) {
        if (avatarStream is { CanSeek: true, Position: > 0 }) {
            avatarStream.Position = 0;
        }
        
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        // begin writing transaction, if s3 upload fail, rollback.
        await using var transaction = await dbContext.Database.BeginTransactionAsync();
        
        int changed = await dbContext.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(setter => {
                setter
                    .SetProperty(u => u.AvatarUpdatedAt, timeProvider.GetUtcNow())
                    .SetProperty(u => u.HasAvatar, true);
            });

        if (changed == 0) {
            return Errors.NoUserFoundFromId();
        }
        
        Result<AvatarUploadResponse> result = await UploadAvatarToS3(userId, avatarStream, contentType);

        if (result.IsSuccess) {
            await transaction.CommitAsync();
        } else {
            await transaction.RollbackAsync();
        }
        
        return result;
    }

    private async Task<Result<AvatarUploadResponse>> UploadAvatarToS3(
        Guid userId, 
        Stream avatarStream, 
        string contentType
    ) {
        var bucketName = config["MediaAWS:BucketName"];
        string uniqueKey = CreateAvatarUniqueKey(userId);
        
        var uploadRequest = new PutObjectRequest {
            InputStream = avatarStream,
            BucketName = bucketName,
            Key = uniqueKey,
            ContentType = contentType,
        };

        try {
            PutObjectResponse response = await s3Client.PutObjectAsync(uploadRequest);

            switch (response.HttpStatusCode) {
                case HttpStatusCode.OK or HttpStatusCode.Created:
                    return Result<AvatarUploadResponse>.Success(new(uniqueKey));

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
            switch (e.StatusCode) {
                case HttpStatusCode.NotFound:
                    return Errors.ResourceNotFound("Avatar");
                
                default:
                    logger.LogError(e, "S3 threw exception.");
                    return Errors.UnexpectedError();
            }
        }
    }

    public string GetAvatarUrl(Guid userId, bool useHttps) {
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

    public async Task<Result> DeleteAvatarAsync(Guid userId) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        // begin writing transaction, if s3 delete fail, rollback.
        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        int changed = await dbContext.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(setter => {
                setter
                    .SetProperty(u => u.AvatarUpdatedAt, timeProvider.GetUtcNow())
                    .SetProperty(u => u.HasAvatar, false);
            });

        if (changed == 0) {
            return Errors.NoUserFoundFromId();
        }

        var result = await DeleteAvatarFromS3(userId);
        
        if (result.IsSuccess) {
            await transaction.CommitAsync();
        } else {
            await transaction.RollbackAsync();
        }
        
        return result;
    }

    private async Task<Result> DeleteAvatarFromS3(Guid userId) {
        var bucketName = config["MediaAWS:BucketName"];
        var uniqueKey = CreateAvatarUniqueKey(userId);
        
        try {
            var response = await s3Client.DeleteObjectAsync(bucketName, uniqueKey);

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

    public async Task<Result> SetupProfileAsync(SetupProfileRequest request) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        var validate = await dbContext.Users
            .Where(u => u.Id == request.UserId)
            .Select(u => new { u.IsProfileSetup })
            .FirstOrDefaultAsync();

        if (validate == null) {
            return Errors.NoUserFoundFromId();
        }
        
        if (validate.IsProfileSetup) {
            return Errors.UserAlreadyVerified();
        }
        
        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        var normalizedName = userManager.NormalizeName(request.UserName);

        int changed = await dbContext.Users
            .Where(u => u.Id == request.UserId)
            .ExecuteUpdateAsync(setter => {
                setter
                    .SetProperty(u => u.UserName, request.UserName)
                    .SetProperty(u => u.NormalizedUserName, normalizedName)
                    .SetProperty(u => u.DisplayName, request.DisplayName);

                switch (request.AvatarOperation.Type) {
                    case AvatarOperationType.Delete:
                        setter
                            .SetProperty(u => u.AvatarUpdatedAt, timeProvider.GetUtcNow())
                            .SetProperty(u => u.HasAvatar, false);
                        break;
                    
                    case AvatarOperationType.Set:
                        setter
                            .SetProperty(u => u.AvatarUpdatedAt, timeProvider.GetUtcNow())
                            .SetProperty(u => u.HasAvatar, true);    // just in case lol.
                        break;
                }
                
                setter.SetProperty(u => u.IsProfileSetup, true);
            });

        if (changed == 0) {
            await transaction.RollbackAsync();
            return Errors.NoUserFoundFromId();  // should unexpected error be thrown?
        }

        switch (request.AvatarOperation.Type) {
            case AvatarOperationType.Set:
            {
                if (request.AvatarOperation.AvatarStream is not { } stream) {
                    await transaction.RollbackAsync();
                    return Errors.MissingArgument("Avatar stream");
                }

                if (request.AvatarOperation.ContentType is not { } contentType) {
                    await transaction.RollbackAsync();
                    return Errors.MissingArgument("Avatar content type");
                }
                
                var result = await UploadAvatarToS3(request.UserId, stream, contentType);

                if (result.IsSuccess) {
                    await transaction.CommitAsync();
                    return Result.Success();
                }

                await transaction.RollbackAsync();
                return Result.Failure(result.Error);
            }

            case AvatarOperationType.Delete:
            {
                var result = await DeleteAvatarFromS3(request.UserId);
                
                if (result.IsSuccess) {
                    await transaction.CommitAsync();
                    return Result.Success();
                }

                await transaction.RollbackAsync();
                return Result.Failure(result.Error);
            }
            
            default:
                await transaction.CommitAsync();
                return Result.Success();
        }
    }

    public async Task<Result<UserBasicProfileResponse>> GetUserBasicProfileAsync(Guid userId) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        UserBasicProfileResponse? result = await dbContext.Users
            .Where(u => u.Id == userId)
            .Select(u => new UserBasicProfileResponse(u.UserName!, u.DisplayName!, u.HasAvatar))
            .FirstOrDefaultAsync();

        return result == null ? 
            Errors.NoUserFoundFromId() : 
            Result<UserBasicProfileResponse>.Success(result);
    }

    private static string CreateAvatarUniqueKey(Guid userId) {
        return $"avatars/users/{userId}";
    }

    private static string GetUnhandledS3ResponseStatusCodeMessage(HttpStatusCode code) {
        return $"S3 response with status code {code} ({(int)code}).";
    }
}