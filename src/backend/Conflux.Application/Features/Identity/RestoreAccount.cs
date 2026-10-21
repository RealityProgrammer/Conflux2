using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Identity;

public sealed record RestoreAccountCommand(string Password) : ICommand<Result>, IAllowNonActiveAccount;

public sealed class RestoreAccountHandler(
    ICurrentUserService currentUserService,
    IUserAccountDeletionWriteRepository accountDeletionWriteRepository,
    TimeProvider timeProvider,
    IAccountDeleteStatusCacheProvider accountDeleteStatusCacheProvider,
    IPasswordHasher<object> passwordHasher,
    IUnitOfWork unitOfWork
) : ICommandHandler<RestoreAccountCommand, Result> {
    public async ValueTask<Result> Handle(
        RestoreAccountCommand command, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        // ensure having a deletion and still in grace-period
        var deletion = await accountDeletionWriteRepository
            .AsQueryable()
            .FirstOrDefaultAsync(d => d.UserId == userId && d.Status == UserAccountDeleteStatus.Pending, cancellationToken);

        if (deletion == null) {
            return Errors.NoPendingAccountDeletion();
        }
        
        // check for grace-period time
        var utcNow = timeProvider.GetUtcNow();

        if (utcNow >= deletion.CreatedAt + TimeSpan.FromDays(14)) {
            return Errors.AccountExpired();
        }
        
        // verify password
        var verificationResult = passwordHasher.VerifyHashedPassword(
            new(), 
            deletion.RestorationPasswordHash ?? string.Empty, 
            command.Password
        );
        
        if (verificationResult == PasswordVerificationResult.Failed) {
            return Errors.InvalidCredentials();
        }

        deletion.Status = UserAccountDeleteStatus.Canceled;
        deletion.AppliedAt = utcNow;
        deletion.RestorationPasswordHash = null;

        await unitOfWork.SaveChangesAsync(cancellationToken);
        
        await accountDeleteStatusCacheProvider.Remove(userId);
        return Result.Success();
    }
}