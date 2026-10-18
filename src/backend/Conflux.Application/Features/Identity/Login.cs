using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Identity;

public sealed record LoginCommand(
    string Email, 
    string Password,
    string DeviceInfo
) : ICommand<Result<LoginResponse>>;

public sealed class LoginHandler(
    IJwtStorage jwtStorage,
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IJwtProvider jwtProvider,
    ISessionService sessionService
) : ICommandHandler<LoginCommand, Result<LoginResponse>> {
    public async ValueTask<Result<LoginResponse>> Handle(LoginCommand command, CancellationToken cancellationToken) {
        var user = await userManager.FindByEmailAsync(command.Email);

        if (user == null) {
            return Errors.InvalidCredentials();
        }
        
        var result = await signInManager.CheckPasswordSignInAsync(user, command.Password, lockoutOnFailure: true);

        if (!result.Succeeded) {
            return Errors.InvalidCredentials();
        }

        var sessionId = await sessionService.CreateSession(user.Id, command.DeviceInfo);
        
        IList<string> roles = await userManager.GetRolesAsync(user);
                    
        jwtProvider.GenerateAccessToken(user, roles, sessionId, out string accessToken, out _);
        jwtProvider.GenerateRefreshToken(out byte[] refreshToken, out DateTimeOffset refreshTokenExpiration);

        var storeResult = await jwtStorage.StoreRefreshToken(user, sessionId, refreshToken, refreshTokenExpiration);
        
        if (!storeResult.IsSuccess) {
            return storeResult.Error;
        }
        
        return Result<LoginResponse>.Success(new(new(
            user.Id,
            user.EmailConfirmed,
            user.IsUserNameLocked,
            roles.AsReadOnly(),
            []
        ), "Bearer", accessToken, Convert.ToBase64String(refreshToken), sessionId));
    }
}