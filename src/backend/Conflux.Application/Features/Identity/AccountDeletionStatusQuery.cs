using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Identity;

public sealed record AccountDeletionStatusQuery : IQuery<Result<AccountDeletionStatus>>;

public sealed class AccountDeletionStatusQueryHandler(
    ICurrentUserService currentUserService,
    IUserAccountDeletionReadRepository userAccountDeletionReadRepository
) : IQueryHandler<AccountDeletionStatusQuery, Result<AccountDeletionStatus>> {
    public async ValueTask<Result<AccountDeletionStatus>> Handle(
        AccountDeletionStatusQuery query, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        var deletion = await userAccountDeletionReadRepository
            .AsQueryable()
            .AsNoTracking()
            .Where(u => u.UserId == userId && u.Status == UserAccountDeleteStatus.Pending)
            .FirstOrDefaultAsync(cancellationToken);

        if (deletion == null) {
            return Errors.NoPendingAccountDeletion();
        }

        return Result<AccountDeletionStatus>.Success(new(
            deletion.CreatedAt,
            deletion.CreatedAt + TimeSpan.FromDays(14),
            deletion.Reason,
            deletion.ExtraMessage
        ));
    }
}