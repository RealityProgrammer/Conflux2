using Conflux.Application.Commands;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;

namespace Conflux.Application.Handlers;

public sealed class CreateCommunityServerHandler(
    ICommunityServerRepository communityServerRepository,
    IUnitOfWork unitOfWork,
    IFileFormatInspector fileFormatInspector,
    IStorageService storageService
) : IRequestHandler<CreateCommunityServerCommand, Result<Guid>> {
    public async ValueTask<Result<Guid>> Handle(CreateCommunityServerCommand request, CancellationToken cancellationToken) {
        CommunityServer server = new() {
            Name = request.Name,
            Description = null,
            HasAvatar = false,
            CreatorUserId = request.CreatorUserId,
            OwnerUserId = request.CreatorUserId,
            Members = [],
        };

        CommunityServerMember ownerMember = new() {
            UserId = request.CreatorUserId,
            CommunityServer = server,
        };
        
        server.Members.Add(ownerMember);
        
        communityServerRepository.Add(server);
        
        await unitOfWork.SaveChangesAsync(cancellationToken);
        
        if (request.AvatarStream is { } avatarStream) {
            if (fileFormatInspector.DetermineFileFormat(avatarStream) is not { } fileFormat) {
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(avatarStream)] = [
                        "Unknown file format.",
                    ]
                });
            }

            if (fileFormat is not Image imageFormat) {
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(avatarStream)] = [
                        "Image file format required.",
                    ],
                });
            }

            if (imageFormat.MediaType is not "image/png" and not "image/jpeg") {
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(avatarStream)] = [
                        "Only PNG or JPEG image formats are supported.",
                    ],
                });
            }

            if (avatarStream is { CanSeek: true, Position: > 0 }) {
                avatarStream.Position = 0;
            }

            Result<string> uploadResult = 
                await storageService.UploadCommunityServerAvatar(server.Id, new(avatarStream, imageFormat.MediaType), cancellationToken);

            if (uploadResult.IsSuccess) {
                await communityServerRepository.UpdateHasAvatar(server.Id, true);
            }
        }

        return Result<Guid>.Success(server.Id);
    }
}