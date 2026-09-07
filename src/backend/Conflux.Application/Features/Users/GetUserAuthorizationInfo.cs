using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Users;

public sealed record GetUserAuthorizationInfoQuery(string UserId) : IQuery<Result<UserAuthorizationInfo>>;

public sealed class GetUserAuthorizationInfoHandler(
    UserManager<ApplicationUser> userManager
) : IQueryHandler<GetUserAuthorizationInfoQuery, Result<UserAuthorizationInfo>> {
    public async ValueTask<Result<UserAuthorizationInfo>> Handle(GetUserAuthorizationInfoQuery query, CancellationToken cancellationToken) {
        var user = await userManager.FindByIdAsync(query.UserId);

        if (user == null) {
            return Result<UserAuthorizationInfo>.Failure(Errors.NoUserFoundFromId());
        }

        var userRoles = await userManager.GetRolesAsync(user);
        
        return Result<UserAuthorizationInfo>.Success(new(
            user.Id,
            user.EmailConfirmed,
            user.IsProfileSetup,
            userRoles.AsReadOnly(),
            []
        ));
    }
}