using Conflux.Application.Dto;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Queries.GetUserAuthorizationInfo;

public sealed class GetUserAuthorizationInfoHandler(
    UserManager<ApplicationUser> userManager,
    IAuthRepository authRepository
) : IQueryHandler<GetUserAuthorizationInfoQuery, Result<UserAuthorizationInfo>> {
    public async ValueTask<Result<UserAuthorizationInfo>> Handle(GetUserAuthorizationInfoQuery query, CancellationToken cancellationToken) {
        var user = await userManager.FindByIdAsync(query.UserId);

        if (user == null) {
            return Result<UserAuthorizationInfo>.Failure(Errors.NoUserFoundFromId());
        }

        var userRoles = await authRepository.GetUserRoles(user);
        
        return Result<UserAuthorizationInfo>.Success(new(
            user.Id,
            user.EmailConfirmed,
            user.IsProfileSetup,
            userRoles.AsReadOnly(),
            []
        ));
    }
}