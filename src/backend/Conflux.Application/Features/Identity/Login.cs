using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Identity;

public sealed record LoginCommand(string Email, string Password) : ICommand<Result<LoginResponse>>;

public sealed class LoginHandler(
    IJwtStorage jwtStorage,
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IJwtProvider jwtProvider
) : ICommandHandler<LoginCommand, Result<LoginResponse>> {
    public async ValueTask<Result<LoginResponse>> Handle(LoginCommand request, CancellationToken cancellationToken) {
        var user = await userManager.FindByEmailAsync(request.Email);

        if (user == null) {
            return Errors.InvalidCredentials();
        }
        
        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

        if (!result.Succeeded) {
            return Errors.InvalidCredentials();
        }
        
        IList<string> roles = await userManager.GetRolesAsync(user);
                    
        jwtProvider.GenerateAccessToken(user, roles, out string accessToken, out _);
        jwtProvider.GenerateRefreshToken(out string refreshToken, out DateTimeOffset refreshTokenExpiration);

        var storeResult = await jwtStorage.StoresAuthenticationToken(user, refreshToken, refreshTokenExpiration);
        
        if (!storeResult.IsSuccess) {
            return storeResult.Error;
        }
        
        return Result<LoginResponse>.Success(new(new(
            user.Id,
            user.EmailConfirmed,
            user.IsProfileSetup,
            roles.AsReadOnly(),
            []
        ), "Bearer", accessToken, refreshToken));
    }
}