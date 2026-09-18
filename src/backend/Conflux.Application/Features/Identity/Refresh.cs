using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Identity;

public sealed record RefreshCommand(string Email, string RefreshToken) : ICommand<Result<RefreshResponse>>;

public sealed class RefreshHandler(
    UserManager<ApplicationUser> userManager,
    IJwtStorage jwtStorage,
    IJwtProvider jwtProvider
) : ICommandHandler<RefreshCommand, Result<RefreshResponse>> {
    public async ValueTask<Result<RefreshResponse>> Handle(RefreshCommand request, CancellationToken cancellationToken) {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null) {
            return Errors.NoUserFoundFromEmail();
        }

        var result = await jwtStorage.CheckAuthenticationToken(user, request.RefreshToken);

        if (!result.IsSuccess) {
            return result.Error;
        }

        IList<string> roles = await userManager.GetRolesAsync(user);
        jwtProvider.GenerateAccessToken(user, roles, out string accessToken, out _);
        
        return Result<RefreshResponse>.Success(new(new(
            user.Id,
            user.EmailConfirmed,
            user.IsUserNameLocked,
            roles.AsReadOnly(),
            []
        ), "Bearer", accessToken));
    }
}