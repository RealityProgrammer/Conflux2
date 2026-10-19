using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Users;

public sealed record LockNameCommand : ICommand<Result>;

public sealed class LockNameHandler(
    ICurrentUserService currentUserService,
    IUserRepository userRepository
) : ICommandHandler<LockNameCommand, Result> {
    public async ValueTask<Result> Handle(LockNameCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }
        
        int updated = await userRepository
            .AsQueryable()
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(builder => {
                builder.SetProperty(u => u.IsUserNameLocked, true);
            }, cancellationToken);

        return updated > 0 ? Result.Success() : Errors.NoUserFoundFromId();
    }
}