using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Diagnostics.CodeAnalysis;

namespace Conflux.Application.Features.Servers;

public sealed record CreateServerRoleCommand(
    Guid ServerId,
    string Name
) : ICommand<Result<ServerRoleDto>>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.CreateRole];
}

[DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicParameterlessConstructor)]
public sealed class CreateServerRoleCommandValidator : AbstractValidator<CreateServerRoleCommand> {
    public CreateServerRoleCommandValidator() {
        RuleFor(c => c.Name)
            .Length(1, 32)
            .WithMessage(ValidationMessages.StringLengthBetween);
    }
}

public sealed record ServerRoleCreatedNotification(
    Guid ServerId,
    ServerRoleDto Role
) : INotification;

public sealed class CreateServerRoleHandler(
    ICurrentUserService currentUserService,
    ICommunityServerRoleRepository repository,
    IUnitOfWork unitOfWork,
    IMediator mediator
) : ICommandHandler<CreateServerRoleCommand, Result<ServerRoleDto>> {
    public async ValueTask<Result<ServerRoleDto>> Handle(CreateServerRoleCommand command, CancellationToken cancellationToken) {
        Guid userId = currentUserService.UserId!.Value;
        
        CommunityServerRole role = new() {
            CommunityServerId = command.ServerId,
            Name = command.Name,
            CreatorUserId = userId,
            AuthorizeLevel = 1,
        };

        repository.Add(role);

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation } postgresException) {
            if (postgresException.ConstraintName == "FK_CommunityServerRoles_CommunityServers_CommunityServerId") {
                return Errors.ResourceNotFound("Community server");
            }

            return Errors.UnexpectedError();
        } catch (OperationCanceledException) {
            throw;
        } catch {
            return Errors.UnexpectedError();
        }

        ServerRoleDto dto = new(
            role.Id,
            role.Name,
            role.Permissions.ToDictionary(p => p.Permission, p => p.State),
            role.AuthorizeLevel
        );

        await mediator.Publish(new ServerRoleCreatedNotification(command.ServerId, dto), CancellationToken.None);
        
        return Result<ServerRoleDto>.Success(dto);
    }
}