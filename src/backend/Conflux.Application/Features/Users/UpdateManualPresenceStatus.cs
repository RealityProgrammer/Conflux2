using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Users;

public sealed record UpdateManualPresenceStatusCommand(Guid UserId, PresenceStatus Status) : ICommand<Result>;

public sealed class UpdateManualPresenceStatus(
    IUserRepository userRepository
) : ICommandHandler<UpdateManualPresenceStatusCommand, Result> {
    public async ValueTask<Result> Handle(UpdateManualPresenceStatusCommand command, CancellationToken cancellationToken) {
        int changed = await userRepository.AsQueryable()
            .Where(r => r.Id == command.UserId)
            .ExecuteUpdateAsync(builder => {
                builder.SetProperty(u => u.ManualPresenceStatus, command.Status);
            }, cancellationToken);

        return changed > 0 ? Result.Success() : Errors.NoUserFoundFromId();
    }
}