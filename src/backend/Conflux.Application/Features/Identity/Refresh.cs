using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Identity;

public sealed record RefreshCommand(
    Guid UserId,
    Guid SessionId, 
    string RefreshToken
) : ICommand<Result<RefreshResult>>, IAllowNonActiveAccount;

public sealed class RefreshHandler(
    UserManager<ApplicationUser> userManager,
    IJwtStorage jwtStorage,
    IJwtProvider jwtProvider,
    ISessionService sessionService,
    IAccountDeleteStatusCacheProvider accountDeleteStatusCacheProvider
) : ICommandHandler<RefreshCommand, Result<RefreshResult>> {
    public async ValueTask<Result<RefreshResult>> Handle(RefreshCommand command, CancellationToken cancellationToken) {
        var user = await userManager.FindByIdAsync(command.UserId.ToString());
        
        if (user == null) {
            return Errors.InvalidCredentials();
        }
        
        var deleteStatus = await accountDeleteStatusCacheProvider.Check(user.Id, cancellationToken);
        
        if (deleteStatus is not AccountDeletionStatus.None and not AccountDeletionStatus.Pending) {
            return Errors.InvalidCredentials();
        }

        // check and rotate the refresh token
        Guid sessionId = command.SessionId;
        Result<RefreshTokenRotationResult> result = await jwtStorage.RotateRefreshToken(
            user, 
            sessionId, 
            Convert.FromBase64String(command.RefreshToken)
        );
        
        if (!result.IsSuccess) {
            return result.Error;
        }
        
        // check session
        if (!await sessionService.IsSessionValid(user.Id, sessionId)) {
            return Errors.InvalidRefreshToken();
        }

        await sessionService.ResetSessionActivityTime(user.Id, sessionId);

        bool isPendingDeletion = deleteStatus == AccountDeletionStatus.Pending;
        IList<string> roles = !isPendingDeletion ? await userManager.GetRolesAsync(user) : [];
        
        jwtProvider.GenerateAccessToken(user, roles, sessionId, out string accessToken, out DateTimeOffset accessTokenExpireAt);
        
        return Result<RefreshResult>.Success(new(new(
            user.Id,
            user.EmailConfirmed,
            isPendingDeletion,
            user.IsUserNameLocked,
            roles.AsReadOnly(),
            []
        ), "Bearer", accessToken, accessTokenExpireAt, Convert.ToBase64String(result.Value!.NewRefreshToken), result.Value!.NewExpiration));
    }
}