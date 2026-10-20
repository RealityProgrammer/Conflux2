using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Identity;

public sealed record RestoreAccountCommand : ICommand<Result>;

public sealed partial class RestoreAccountHandler(
    ICurrentUserService currentUserService,
    IUserAccountDeletionWriteRepository accountDeletionWriteRepository,
    TimeProvider timeProvider,
    ILogger<RestoreAccountHandler> logger
) : ICommandHandler<RestoreAccountCommand, Result> {
    public async ValueTask<Result> Handle(RestoreAccountCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        var utcNow = timeProvider.GetUtcNow();

        int updated = await accountDeletionWriteRepository
            .AsQueryable()
            .Where(x => x.UserId == userId && x.Status == UserAccountDeleteStatus.Pending)
            .ExecuteUpdateAsync(builder => {
                builder.SetProperty(r => r.Status, UserAccountDeleteStatus.Canceled);
                builder.SetProperty(r => r.AppliedAt, utcNow);
            }, cancellationToken);

        switch (updated) {
            case 0: return Errors.NoPendingAccountDeletion();
            case 1: return Result.Success();
            
            default:
                LogMultipleRowsUpdated(logger, userId);
                return Result.Success();
        }
    }
    
    [LoggerMessage(LogLevel.Information, "Somehow we got 2 rows updated for user {userId}.")]
    private static partial void LogMultipleRowsUpdated(ILogger logger, Guid userId);
}