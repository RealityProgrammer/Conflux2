using Conflux.Application.Dto;
using Conflux.Application.Options;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace Conflux.Application.Services.Implementations;

internal sealed class AuthService(
    UserManager<ApplicationUser> userManager,
    IAuthRepository authRepository
) : IAuthService {
    public async Task<Result<UserAuthorizationInfo?>> GetAuthorizationInfo(string userId) {
        var user = await userManager.FindByIdAsync(userId);

        if (user == null) {
            return Result<UserAuthorizationInfo?>.Failure(Errors.NoUserFoundFromId());
        }

        var userRoles = await authRepository.GetUserRoles(user);
        
        return Result<UserAuthorizationInfo?>.Success(new(
            user.Id,
            user.EmailConfirmed,
            user.IsProfileSetup,
            userRoles.AsReadOnly(),
            []
        ));
    }
}