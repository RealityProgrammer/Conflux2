using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Commands.RefreshSession;

public sealed class RefreshSessionHandler(
    UserManager<ApplicationUser> userManager,
    IAuthRepository authRepository,
    IJwtProvider jwtProvider
) : ICommandHandler<RefreshSessionCommand, Result<RefreshResponse>> {
    public async ValueTask<Result<RefreshResponse>> Handle(RefreshSessionCommand request, CancellationToken cancellationToken) {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user == null) {
            return Errors.NoUserFoundFromEmail();
        }

        var result = await authRepository.CheckAuthenticationToken(user, request.RefreshToken);

        if (!result.IsSuccess) {
            return result.Error;
        }
        
        IList<string> roles = await authRepository.GetUserRoles(user);
        jwtProvider.GenerateAccessToken(user, roles, out string accessToken, out _);
        
        return Result<RefreshResponse>.Success(new(new(
            user.Id,
            user.EmailConfirmed,
            user.IsProfileSetup,
            roles.AsReadOnly(),
            []
        ), "Bearer", accessToken));
    }
}