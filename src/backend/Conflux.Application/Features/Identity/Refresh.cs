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
) : ICommand<Result<RefreshResponse>>;

public sealed class RefreshHandler(
    UserManager<ApplicationUser> userManager,
    IJwtStorage jwtStorage,
    IJwtProvider jwtProvider,
    ISessionService sessionService
) : ICommandHandler<RefreshCommand, Result<RefreshResponse>> {
    public async ValueTask<Result<RefreshResponse>> Handle(RefreshCommand command, CancellationToken cancellationToken) {
        var user = await userManager.FindByEmailAsync(command.Email);
        if (user == null) {
            return Errors.NoUserFoundFromEmail();
        }

        // check refresh token
        Guid sessionId = command.SessionId;
        var result = await jwtStorage.CheckRefreshToken(user, sessionId, Convert.FromBase64String(command.RefreshToken));

        if (!result.IsSuccess) {
            return result.Error;
        }
        
        // check session
        if (!await sessionService.IsSessionValid(user.Id, sessionId)) {
            return Errors.InvalidRefreshToken();
        }

        await sessionService.TickleSession(user.Id, sessionId);

        IList<string> roles = await userManager.GetRolesAsync(user);
        jwtProvider.GenerateAccessToken(user, roles, sessionId, out string accessToken, out _);
        
        return Result<RefreshResponse>.Success(new(new(
            user.Id,
            user.EmailConfirmed,
            user.IsUserNameLocked,
            roles.AsReadOnly(),
            []
        ), "Bearer", accessToken));
    }
}