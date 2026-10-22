using Conflux.Application.Dto;
using Conflux.Application.Enums;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Identity;

public sealed record LoginCommand(
    string Email, 
    string Password,
    string OperatingSystemInfo,
    string BrowserInfo,
    SessionDevice Device
) : ICommand<Result<LoginResult>>, IAllowNonActiveAccount;

public sealed class LoginHandler(
    IJwtStorage jwtStorage,
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    IJwtProvider jwtProvider,
    ISessionService sessionService,
    IAccountDeleteStatusCacheProvider accountDeleteStatusCacheProvider
) : ICommandHandler<LoginCommand, Result<LoginResult>> {
    public async ValueTask<Result<LoginResult>> Handle(LoginCommand command, CancellationToken cancellationToken) {
        var user = await userManager.FindByEmailAsync(command.Email);

        // restrict deleted account access
        if (user is not { DeletedAt: null }) {
            return Errors.InvalidCredentials();
        }

        var deleteStatus = await accountDeleteStatusCacheProvider.Check(user.Id, cancellationToken);

        if (deleteStatus is not AccountDeletionStatus.None and not AccountDeletionStatus.Pending) {
            return Errors.InvalidCredentials();
        }
        
        var result = await signInManager.CheckPasswordSignInAsync(user, command.Password, lockoutOnFailure: true);

        if (!result.Succeeded) {
            return Errors.InvalidCredentials();
        }

        var sessionId = await sessionService.CreateSession(user.Id, command.OperatingSystemInfo, command.BrowserInfo, command.Device);
        bool isPendingDeletion = deleteStatus == AccountDeletionStatus.Pending;
        
        IList<string> roles = !isPendingDeletion ? await userManager.GetRolesAsync(user) : [];
                    
        jwtProvider.GenerateAccessToken(user, roles, sessionId, out string accessToken, out DateTimeOffset accessTokenExpireAt);
        jwtProvider.GenerateRefreshToken(out byte[] refreshToken, out DateTimeOffset refreshTokenExpireAt);

        var storeResult = await jwtStorage.StoreRefreshToken(user, sessionId, refreshToken, refreshTokenExpireAt);
        
        if (!storeResult.IsSuccess) {
            return storeResult.Error;
        }
        
        return Result<LoginResult>.Success(new(new(
            user.Id,
            user.EmailConfirmed,
            isPendingDeletion,
            user.IsUserNameLocked,
            roles.AsReadOnly(),
            []
        ), "Bearer", accessToken, accessTokenExpireAt, Convert.ToBase64String(refreshToken), refreshTokenExpireAt, sessionId));
    }
}