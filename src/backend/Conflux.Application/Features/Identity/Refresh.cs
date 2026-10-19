using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Identity;

public sealed record RefreshCommand(
    string Email, 
    Guid SessionId, 
    string RefreshToken
) : ICommand<Result<RefreshResult>>;

public sealed class RefreshHandler(
    UserManager<ApplicationUser> userManager,
    IJwtStorage jwtStorage,
    IJwtProvider jwtProvider,
    ISessionService sessionService,
    IUserAccountDeletionReadRepository userAccountDeletionReadRepository
) : ICommandHandler<RefreshCommand, Result<RefreshResult>> {
    public async ValueTask<Result<RefreshResult>> Handle(RefreshCommand command, CancellationToken cancellationToken) {
        var user = await userManager.FindByEmailAsync(command.Email);
        if (user == null) {
            return Errors.NoUserFoundFromEmail();
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
        
        IList<string> roles = await userManager.GetRolesAsync(user);
        jwtProvider.GenerateAccessToken(user, roles, sessionId, out string accessToken, out DateTimeOffset accessTokenExpireAt);
        
        bool isPendingDeletion = await userAccountDeletionReadRepository.HasPendingDelete(user.Id, cancellationToken);
        
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