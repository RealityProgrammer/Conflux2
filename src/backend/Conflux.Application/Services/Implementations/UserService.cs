using Amazon.S3;
using Amazon.S3.Model;
using Conflux.Application.Dto;
using Conflux.Application.Dto.Requests;
using Conflux.Application.Dto.Responses;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Net;

namespace Conflux.Application.Services.Implementations;

internal sealed class UserService(
    IUserRepository userRepository,
    IAmazonS3 s3Client,
    TimeProvider timeProvider,
    IConfiguration config,
    ILogger<UserService> logger
) : IUserService {
    public async Task<Result> UploadAvatarAsync(Guid userId, Stream avatarStream, string contentType) {
        if (avatarStream is { CanSeek: true, Position: > 0 }) {
            avatarStream.Position = 0;
        }
        
        // upload file to S3 first.
        Result result = await UploadAvatarToS3(userId, avatarStream, contentType);

        if (!result.IsSuccess) {
            return result.Error;
        }

        bool updateSuccessful = await userRepository.UpdateAvatarStatusAsync(userId, true);

        if (updateSuccessful) {
            return Result.Success();
        }
        
        // TODO: Should we delete the avatar on failure? Might need to check if it exists in the first place.

        return Errors.OperationFailure("upload user avatar");
    }

    private async Task<Result> UploadAvatarToS3(
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
        var result = await DeleteAvatarFromS3(userId);

        if (!result.IsSuccess) {
            return result;
        }

        bool updateSuccessful = await userRepository.UpdateAvatarStatusAsync(userId, false);

        if (updateSuccessful) {
            return Result.Success();
        }
        
        return Errors.OperationFailure("delete user avatar");
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
        Result<bool> validateResult = await userRepository.IsProfileSetupAsync(request.UserId);

        if (!validateResult.IsSuccess) {
            return validateResult.Error;
        }

        if (validateResult.Value) {
            return Errors.UserAlreadyVerified();
        }

        // avatar upload operations, it's probably safe to ignore error results.
        switch (request.AvatarOperation.Type) {
            case AvatarOperationType.Set:
                if (request.AvatarOperation.AvatarStream is not { } stream) {
                    return Errors.MissingArgument("Avatar stream");
                }
                if (request.AvatarOperation.ContentType is not { } contentType) {
                    return Errors.MissingArgument("Avatar content type");
                }
                
                await UploadAvatarAsync(request.UserId, stream, contentType);
                break;
            
            case AvatarOperationType.Delete:
                await DeleteAvatarAsync(request.UserId);
                break;
        }

        return await userRepository.SetupProfileAsync(request.UserId, request.UserName, request.DisplayName);
    }

    public async Task<Result<UserBasicProfileSummary>> GetUserBasicProfileAsync(Guid userId) {
        return await userRepository.GetUserBasicProfileAsync(userId);
    }

    private static string CreateAvatarUniqueKey(Guid userId) {
        return $"avatars/users/{userId}";
    }

    private static string GetUnhandledS3ResponseStatusCodeMessage(HttpStatusCode code) {
        return $"S3 response with status code {code} ({(int)code}).";
    }
}