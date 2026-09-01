using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;

namespace Conflux.Application.Features.Commands.CreateServer;

public sealed class CreateServerHandler(
    ICommunityServerRepository communityServerRepository,
    IUnitOfWork unitOfWork,
    IFileFormatInspector fileFormatInspector,
    IBlobStorage blobStorage
) : ICommandHandler<CreateServerCommand, Result<Guid>> {
    public async ValueTask<Result<Guid>> Handle(CreateServerCommand request, CancellationToken cancellationToken) {
        CommunityServer server = new() {
            Name = request.Name,
            Description = null,
            HasAvatar = false,
            CreatorUserId = request.CreatorUserId,
            OwnerUserId = request.CreatorUserId,
            Members = [],
        };

        CommunityServerRole defaultRole = new() {
            Name = "Default",
            SpecialRoleType = SpecialRoleType.Default,
            AuthorizeLevel = -1,
            CreatorUserId = request.CreatorUserId,
            Permissions = [..Enum.GetValues<ServerPermission>().Select(p => new RolePermission {
                Permission = p,
                State = PermissionState.Disable,
            })],
        };

        CommunityServerRole ownerRole = new() {
            Name = "Owner",
            SpecialRoleType = SpecialRoleType.Owner,
            AuthorizeLevel = int.MaxValue,
            Permissions = [],   // owner is the special role, so every operation short-circuit 
            CreatorUserId = request.CreatorUserId,
        };

        server.Roles = [ownerRole]; // all members have implicit default role, so no need to waste memory storing it in the database

        CommunityServerMember ownerMember = new() {
            UserId = request.CreatorUserId,
            CommunityServer = server,
            MemberRoles = [
                new() {
                    Role = ownerRole,
                },
                new() {
                    Role = defaultRole,
                }
            ],
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
                await blobStorage.UploadCommunityServerAvatar(server.Id, new(avatarStream, imageFormat.MediaType), cancellationToken);

            if (uploadResult.IsSuccess) {
                await communityServerRepository.UpdateHasAvatar(server.Id, true);
            }
        }

        return Result<Guid>.Success(server.Id);
    }
}