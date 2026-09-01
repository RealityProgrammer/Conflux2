using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Identity;

public sealed record LoginCommand(string Email, string Password) : ICommand<Result<LoginResponse>>;

public sealed class LoginHandler(
    IAuthRepository authRepository,
    IJwtProvider jwtProvider
) : ICommandHandler<LoginCommand, Result<LoginResponse>> {
    public async ValueTask<Result<LoginResponse>> Handle(LoginCommand request, CancellationToken cancellationToken) {
        var user = await authRepository.GetUserByLoginCredential(request.Email, request.Password);

        if (user != null) {
            IList<string> roles = await authRepository.GetUserRoles(user);
                        
            jwtProvider.GenerateAccessToken(user, roles, out string accessToken, out _);
            jwtProvider.GenerateRefreshToken(out string refreshToken, out DateTimeOffset refreshTokenExpiration);

            var storeResult = await authRepository.StoresAuthenticationToken(user, refreshToken, refreshTokenExpiration);
            
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

        return Errors.InvalidCredentials();
    }
}