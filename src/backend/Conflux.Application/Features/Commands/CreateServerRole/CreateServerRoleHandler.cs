using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Conflux.Application.Features.Commands.CreateServerRole;

public sealed class CreateServerRoleHandler(
    ICommunityServerRoleRepository repository,
    IUnitOfWork unitOfWork
) : ICommandHandler<CreateServerRoleCommand, Result<Guid>> {
    public async ValueTask<Result<Guid>> Handle(CreateServerRoleCommand command, CancellationToken cancellationToken) {
        CommunityServerRole role = new() {
            CommunityServerId = command.ServerId,
            Name = command.Name,
            CreatorUserId = command.ExecutorUserId,
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
        
        return Result<Guid>.Success(role.Id);
    }
}