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
    IServerMediaService serverMediaService
) : ICommandHandler<CreateServerCommand, Result<ServerIdentityDto>> {
    public async ValueTask<Result<ServerIdentityDto>> Handle(
        CreateServerCommand request, 
        CancellationToken cancellationToken
    ) {
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
            return postgresException.ConstraintName == "FK_CommunityServers_AspNetUsers_CreatorUserId" ? 
                Errors.ResourceNotFound("Creator user") : 
                Errors.UnexpectedError();
        } catch (OperationCanceledException) {
            throw;
        } catch {
            return Errors.UnexpectedError();
        }
        
        // upload the avatar, doesn't matter if it's upload successfully or not the importance is we got everything created.
        if (request.AvatarStream is { } avatarStream) {
            await serverMediaService.UploadAvatar(server.Id, avatarStream, CancellationToken.None);
        }

        return Result<ServerIdentityDto>.Success(new(server));
    }
}