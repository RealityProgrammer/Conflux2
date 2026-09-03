using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Conflux.Application.Features.Servers;

public sealed record CreateServerCommand(
    Guid CreatorUserId, 
    string Name, 
    Stream? AvatarStream
) : ICommand<Result<ServerIdentityDto>>;

public sealed class CreateServerHandler(
    ICommunityServerRepository communityServerRepository,
    IUnitOfWork unitOfWork,
    IFileFormatInspector fileFormatInspector,
    IBlobStorage blobStorage
) : ICommandHandler<CreateServerCommand, Result<ServerIdentityDto>> {
    public async ValueTask<Result<ServerIdentityDto>> Handle(
        CreateServerCommand request, 
        CancellationToken cancellationToken
    ) {
        string? avatarImageType = null;
        
        if (request.AvatarStream != null) {
            if (fileFormatInspector.DetermineFileFormat(request.AvatarStream) is not { } fileFormat) {
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(request.AvatarStream)] = [
                        "Unknown file format.",
                    ]
                });
            }

            if (fileFormat is not Image imageFormat) {
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(request.AvatarStream)] = [
                        "Image file format required.",
                    ],
                });
            }

            if (imageFormat.MediaType is not "image/png" and not "image/jpeg") {
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(request.AvatarStream)] = [
                        "Only PNG or JPEG image formats are supported.",
                    ],
                });
            }

            request.AvatarStream.Position = 0;
            avatarImageType = imageFormat.MediaType;
        }
        
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

        server.Roles = [defaultRole, ownerRole]; // all members have implicit default role, so no need to waste memory storing it in the database

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

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation } postgresException) {
            if (postgresException.ConstraintName == "FK_CommunityServers_AspNetUsers_CreatorUserId") {
                return Errors.ResourceNotFound("Creator user");
            }

            return Errors.UnexpectedError();
        } catch (OperationCanceledException) {
            throw;
        } catch {
            return Errors.UnexpectedError();
        }
        
        // finally, upload the avatar
        if (avatarImageType != null) {
            // none because avatar is not as important as server creation, allow it to pass the cancellation.
            Result<string> uploadResult = 
                await blobStorage.UploadCommunityServerAvatar(server.Id, new(request.AvatarStream!, avatarImageType), CancellationToken.None);

            if (uploadResult.IsSuccess) {
                server.HasAvatar = true;
                
                try {
                    await unitOfWork.SaveChangesAsync(CancellationToken.None);
                } catch {
                    return Errors.UnexpectedError();
                }
            }
        }

        return Result<ServerIdentityDto>.Success(new(server.Id, server.Name, server.HasAvatar));
    }
}