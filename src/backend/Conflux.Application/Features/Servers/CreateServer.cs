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

public sealed record ServerCreatedNotification(
    Guid CreatorUserId,
    Guid ServerId
) : INotification;

public sealed class CreateServerHandler(
    ICommunityServerRepository communityServerRepository,
    IUnitOfWork unitOfWork,
    IServerMediaService serverMediaService,
    IMediaItemWriteRepository mediaItemWriteRepository,
    ILogger<CreateServerHandler> logger,
    IPublisher publisher
) : ICommandHandler<CreateServerCommand, Result<ServerIdentityDto>> {
    public async ValueTask<Result<ServerIdentityDto>> Handle(
        CreateServerCommand command, 
        CancellationToken cancellationToken
    ) {
        Guid creatorId = command.CreatorUserId;
        
        CommunityServer server = new() {
            Name = command.Name,
            Description = null,
            CreatorUserId = creatorId,
            OwnerUserId = creatorId,
            Members = [],
        };

        CommunityServerRole defaultRole = new() {
            Name = "Default",
            SpecialRoleType = SpecialRoleType.Default,
            AuthorizeLevel = -1,
            CreatorUserId = creatorId,
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
            CreatorUserId = creatorId,
        };

        server.Roles = [defaultRole, ownerRole]; // all members have implicit default role, so no need to waste memory storing it in the database

        CommunityServerMember ownerMember = new() {
            UserId = creatorId,
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
            return postgresException.ConstraintName == "FK_CommunityServers_AspNetUsers_CreatorUserId" ? 
                Errors.ResourceNotFound("Creator user") : 
                Errors.UnexpectedError();
        } catch (OperationCanceledException) {
            throw;
        } catch {
            return Errors.UnexpectedError();
        }
        
        // upload avatar
        if (command.AvatarStream is { } avatarStream) {
            Result<MediaUploadResult> avatarUploadResult = 
                await serverMediaService.UploadAvatar(server.Id, avatarStream, CancellationToken.None);

            if (avatarUploadResult.IsSuccess) {
                MediaItem mediaItem = new() {
                    ContentType = avatarUploadResult.Value!.Format.MediaType,
                    Type = MediaItemType.ServerAvatar,
                    Version = 1,
                };
                
                mediaItemWriteRepository.Add(mediaItem);
                server.Avatar = mediaItem;
                
                try {
                    await unitOfWork.SaveChangesAsync(cancellationToken);
                } catch (OperationCanceledException) {
                    await serverMediaService.DeleteAvatar(server.Id, CancellationToken.None);
                    throw;
                } catch (Exception e) {
                    logger.LogError(e, "Exception thrown while uploading server avatar.");
                    await serverMediaService.DeleteAvatar(server.Id, CancellationToken.None);
                }
            }
        }

        await publisher.Publish(new ServerCreatedNotification(creatorId, server.Id), CancellationToken.None);
        return Result<ServerIdentityDto>.Success(new(server));
    }
}