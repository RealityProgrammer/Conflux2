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
    IConfiguration config
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
            .ExecuteUpdateAsync(setters => {
                setters.SetProperty(u => u.AvatarUpdatedAt, timeProvider.GetUtcNow());
                setters.SetProperty(u => u.HasAvatar, true);
            });

        if (changed == 0) {
            return Result<AvatarUploadResponse>.Failure("User.NoId", "No user with the provided ID.");
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
                    return Result<AvatarUploadResponse>.Failure(
                        "User.UploadAvatar.Authorize",
                        "Cannot upload avatar to S3 service due to authorization issue."
                    );

                case HttpStatusCode.ServiceUnavailable:
                    return Result<AvatarUploadResponse>.Failure(
                        "User.UploadAvatar.ServiceUnavailable",
                        "Cannot upload avatar to S3 service."
                    );

                case HttpStatusCode.MethodNotAllowed:
                    return Result<AvatarUploadResponse>.Failure(
                        "User.UploadAvatar.MethodNotAllowed",
                        "Method is not allowed (Potentially using discontinued supports for Email Grantee ACLs)."
                    );

                default:
                    return Result<AvatarUploadResponse>.Failure(
                        "User.UploadAvatar.StatusCode",
                        GetUnhandledS3ResponseStatusCodeMessage(response.HttpStatusCode)
                    );
            }
        } catch (AmazonS3Exception e) {
            return Result<AvatarUploadResponse>.Failure(
                "User.UploadAvatar.S3Exception",
                GetUnhandledS3ResponseStatusCodeMessage(e.StatusCode)
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
                Expires = timeProvider.GetUtcNow().AddHours(1).DateTime,
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

        // begin writing transaction, if s3 delete fail, rollback.
        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        int changed = await dbContext.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(setters => {
                setters.SetProperty(u => u.AvatarUpdatedAt, timeProvider.GetUtcNow());
                setters.SetProperty(u => u.HasAvatar, false);
            });

        if (changed == 0) {
            return Result.Failure("User.NoId", "No user with the provided ID.");
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
                    return Result.Failure("User.DeleteAvatar.NotFound", "User has no avatar.");
                
                default:
                    return Result.Failure("User.DeleteAvatar", GetUnhandledS3ResponseStatusCodeMessage(response.HttpStatusCode));
            }
        } catch (Exception ex) {
            return Result.Failure("User.DeleteAvatar", ex.Message);
        }
    }

    public async Task<Result> SetupProfileAsync(SetupProfileRequest request) {
        await using var dbContext = await dbContextFactory.CreateDbContextAsync();

        var validate = await dbContext.Users
            .Where(u => u.Id == request.UserId)
            .Select(u => new { u.IsProfileSetup })
            .FirstOrDefaultAsync();

        if (validate == null) {
            return Result.Failure("User.SetupProfile.NoId", "No user with the provided ID.");
        }
        
        if (validate.IsProfileSetup) {
            return Result.Failure("User.SetupProfile.AlreadySetup", "User already setup their profile.");
        }
        
        await using var transaction = await dbContext.Database.BeginTransactionAsync();

        var normalizedName = userManager.NormalizeName(request.UserName);

        int changed = await dbContext.Users
            .Where(u => u.Id == request.UserId)
            .ExecuteUpdateAsync(setters => {
                setters.SetProperty(u => u.UserName, request.UserName);
                setters.SetProperty(u => u.NormalizedUserName, normalizedName);
                setters.SetProperty(u => u.DisplayName, request.DisplayName);

                switch (request.AvatarOperation.Type) {
                    case AvatarOperationType.Delete:
                        setters.SetProperty(u => u.AvatarUpdatedAt, timeProvider.GetUtcNow());
                        setters.SetProperty(u => u.HasAvatar, false);
                        break;
                    
                    case AvatarOperationType.Set:
                        setters.SetProperty(u => u.AvatarUpdatedAt, timeProvider.GetUtcNow());
                        setters.SetProperty(u => u.HasAvatar, true);    // just in case lol.
                        break;
                }
                
                setters.SetProperty(u => u.IsProfileSetup, true);
            });

        if (changed == 0) {
            await transaction.RollbackAsync();
            return Result.Failure("User.SetupProfile.FailedToUpdate", "Failed to update user profile data.");
        }

        switch (request.AvatarOperation.Type) {
            case AvatarOperationType.Set:
            {
                if (request.AvatarOperation.AvatarStream is not { } stream) {
                    await transaction.RollbackAsync();
                    
                    return Result.Failure(
                        "User.SetupProfile.MissingAvatarStream", 
                        "Avatar stream is missing."
                    );
                }

                if (request.AvatarOperation.ContentType is not { } contentType) {
                    await transaction.RollbackAsync();
                    
                    return Result.Failure(
                        "User.SetupProfile.MissingAvatarContentType", 
                        "Avatar content type is missing."
                    );
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
            Result<UserBasicProfileResponse>.Failure("User.Profile.NoId", "No user with the provided ID.") : 
            Result<UserBasicProfileResponse>.Success(result);
    }

    private static string CreateAvatarUniqueKey(Guid userId) {
        return $"avatars/users/{userId}";
    }

    private static string GetUnhandledS3ResponseStatusCodeMessage(HttpStatusCode code) {
        return $"S3 response with status code {code} ({(int)code}).";
    }
}