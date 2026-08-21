using Conflux.Application.Commands;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;

namespace Conflux.Application.Handlers;

public sealed class UploadUserAvatarHandler(
    IFileFormatInspector fileFormatInspector,
    IBlobStorage blobStorage,
    IUserRepository userRepository
) : IRequestHandler<UploadUserAvatarCommand, Result> {
    public async ValueTask<Result> Handle(UploadUserAvatarCommand request, CancellationToken cancellationToken) {
        var avatarStream = request.AvatarStream;
        
        if (fileFormatInspector.DetermineFileFormat(avatarStream) is not { } fileFormat) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(UploadUserAvatarCommand.AvatarStream)] = [
                    "Unknown file format.",
                ]
            });
        }

        if (fileFormat is not Image imageFormat) {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(UploadUserAvatarCommand.AvatarStream)] = [
                    "Image file format required.",
                ],
            });
        }

        if (fileFormat.MediaType is not "image/png" and not "image/jpeg") {
            return Errors.ValidationErrorsOccurred(new() {
                [nameof(UploadUserAvatarCommand.AvatarStream)] = [
                    "Only PNG or JPEG image formats are supported.",
                ],
            });
        }
        
        if (avatarStream is { CanSeek: true, Position: > 0 }) {
            avatarStream.Position = 0;
        }
        
        // upload file first.
        Result<string> result = await blobStorage.UploadUserAvatar(request.UserId, new(avatarStream, imageFormat.MediaType), cancellationToken);

        if (!result.IsSuccess) {
            return result.Error;
        }

        bool updateSuccessful = await userRepository.UpdateAvatarStatus(request.UserId, true, CancellationToken.None);

        if (updateSuccessful) {
            return Result.Success();
        }
        
        return Errors.OperationFailure("upload user avatar");
    }
}