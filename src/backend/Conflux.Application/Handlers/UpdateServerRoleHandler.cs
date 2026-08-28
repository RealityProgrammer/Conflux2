using Conflux.Application.Commands;
using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class UpdateServerRoleHandler(
    ICommunityServerRoleRepository repository,
    IUnitOfWork unitOfWork
) : ICommandHandler<UpdateServerRoleCommand, Result<CommunityServerRoleDto>> {
    public async ValueTask<Result<CommunityServerRoleDto>> Handle(UpdateServerRoleCommand command, CancellationToken cancellationToken) {
        CommunityServerRole? role = await repository.FindById(command.RoleId, true, cancellationToken);

        if (role == null || role.CommunityServerId != command.ServerId) {
            return Errors.ResourceNotFound("Server role");
        }

        if (role.SpecialRoleType == SpecialRoleType.Owner) {
            return Errors.Forbidden("Updating Owner role is not allowed.");
        }

        if (command.Name.IsSet) {
            role.Name = command.Name.Value!;
        }

        if (command.Permissions.IsSet) {
            role.Permissions = command.Permissions.Value;
        }

        if (command.AuthorizeLevel.IsSet) {
            role.AuthorizeLevel = command.AuthorizeLevel.Value;
        }

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
            
            return Result<CommunityServerRoleDto>.Success(new(
                role.Id,
                role.Name,
                role.Permissions,
                role.AuthorizeLevel
            ));
        } catch (OperationCanceledException) {
            throw;
        } catch (Exception) {
            return Errors.UnexpectedError();
        }
    }
}