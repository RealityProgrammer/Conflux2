using Conflux.Application.Dto;
using Conflux.Application.Options;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;
using Humanizer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;
using System.Diagnostics.CodeAnalysis;

namespace Conflux.Application.Features.Servers;

public sealed record CreateServerCommand(
    string Name, 
    Stream? AvatarStream
) : ICommand<Result<ServerIdentityDto>>;

[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicParameterlessConstructor)]
public sealed class CreateServerCommandValidator : AbstractValidator<CreateServerCommand> {
    public CreateServerCommandValidator(IOptions<MediaOptions> mediaOptions) {
        var options = mediaOptions.Value;
        
        RuleFor(c => c.Name)
            .NotNull()
            .NotEmpty()
            .WithMessage(ValidationMessages.PropertyRequired)
            .Length(1, 48)
            .WithMessage(ValidationMessages.StringLengthBetween);

        RuleFor(c => c.AvatarStream)
            .Must(stream => stream == null || stream.Length <= options.MaxAvatarSize)
            .WithMessage($"Server avatar must be smaller or equals to {options.MaxAvatarSize.Bytes().Megabytes}MB ({options.MaxAvatarSize} bytes).");
    }
}

public sealed record ServerCreatedNotification(
    Guid CreatorUserId,
    Guid ServerId
) : INotification;

public sealed class CreateServerHandler(
    ICurrentUserService currentUserService,
    ICommunityServerRepository communityServerRepository,
    IUnitOfWork unitOfWork,
    IServerMediaService serverMediaService,
    ILogger<CreateServerHandler> logger,
    IPublisher publisher
) : ICommandHandler<CreateServerCommand, Result<ServerIdentityDto>> {
    public async ValueTask<Result<ServerIdentityDto>> Handle(
        CreateServerCommand command, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        CommunityServer server = new() {
            Name = command.Name,
            Description = null,
            CreatorUserId = userId,
            OwnerUserId = userId,
            Members = [],
        };

        CommunityServerRole defaultRole = new() {
            Name = "Default",
            SpecialRoleType = SpecialRoleType.Default,
            AuthorizeLevel = -1,
            CreatorUserId = userId,
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
            CreatorUserId = userId,
        };

        server.Roles = [defaultRole, ownerRole]; // all members have implicit default role, so no need to waste memory storing it in the database

        CommunityServerMember ownerMember = new() {
            UserId = userId,
            CommunityServer = server,
            HighestAuthorizeRole = ownerRole,
            HighestAuthorizeLevel = ownerRole.AuthorizeLevel,
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
                server.AvatarVersion = 1;
                
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

        await publisher.Publish(new ServerCreatedNotification(userId, server.Id), CancellationToken.None);
        return Result<ServerIdentityDto>.Success(new(server));
    }
}