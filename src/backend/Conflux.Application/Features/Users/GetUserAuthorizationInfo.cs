using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Users;

public sealed record GetUserAuthorizationInfoQuery(string UserId) : IQuery<Result<UserAuthorizationInfo>>;

public sealed class GetUserAuthorizationInfoHandler(
    UserManager<ApplicationUser> userManager,
    IAccountDeleteStatusCacheProvider accountDeleteStatusCacheProvider
) : IQueryHandler<GetUserAuthorizationInfoQuery, Result<UserAuthorizationInfo>> {
    public async ValueTask<Result<UserAuthorizationInfo>> Handle(GetUserAuthorizationInfoQuery query, CancellationToken cancellationToken) {
        var user = await userManager.FindByIdAsync(query.UserId);

        if (user == null) {
            return Result<UserAuthorizationInfo>.Failure(Errors.NoUserFoundFromId());
        }
        
        var deleteStatus = await accountDeleteStatusCacheProvider.Check(user.Id, cancellationToken);

        if (deleteStatus is not AccountDeletionStatus.None and not AccountDeletionStatus.Pending) {
            return Errors.InvalidCredentials();
        }

        var userRoles = await userManager.GetRolesAsync(user);
        bool isPendingDeletion = deleteStatus == AccountDeletionStatus.Pending;
        
        return Result<UserAuthorizationInfo>.Success(new(
            user.Id,
            user.EmailConfirmed,
            isPendingDeletion,
            user.IsUserNameLocked,
            userRoles.AsReadOnly(),
            []
        ));
    }
}