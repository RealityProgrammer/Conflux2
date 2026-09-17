using Conflux.Domain;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Users;

public sealed record LockNameCommand(Guid UserId) : ICommand<Result>;

public sealed class LockNameHandler(
    IUserRepository userRepository
) : ICommandHandler<LockNameCommand, Result> {
    public async ValueTask<Result> Handle(LockNameCommand command, CancellationToken cancellationToken) {
        int updated = await userRepository
            .AsQueryable()
            .Where(u => u.Id == command.UserId)
            .ExecuteUpdateAsync(builder => {
                builder.SetProperty(u => u.IsUserNameLocked, true);
            }, cancellationToken);

        return updated > 0 ? Result.Success() : Errors.NoUserFoundFromId();
    }
}