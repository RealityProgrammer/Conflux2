using Conflux.Domain;
using Conflux.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace Conflux.Application.Features.Identity;

public sealed record ResetPasswordCommand(string Email, string Token, string Password) : ICommand<Result>, IAllowNonActiveAccount;

public sealed class ResetPasswordHandler(
    UserManager<ApplicationUser> userManager
) : ICommandHandler<ResetPasswordCommand, Result> {
    public async ValueTask<Result> Handle(ResetPasswordCommand command, CancellationToken cancellationToken) {
        if (await userManager.FindByEmailAsync(command.Email) is not { } user) {
            return Errors.NoUserFoundFromEmail();
        }

        var decodedToken = Base64UrlEncoder.DecodeBytes(command.Token);
        var token = Encoding.UTF8.GetString(decodedToken);
        var result = await userManager.ResetPasswordAsync(user, token, command.Password);

        if (result.Succeeded) {
            return Result.Success();
        }

        var firstError = result.Errors.First();
        return firstError.Code switch {
            nameof(IdentityErrorDescriber.InvalidToken) => Errors.InvalidCredentials(),
            _ when firstError.Code.Contains("Password") => Errors.ValidationErrorsOccurred(new() {
                [nameof(ResetPasswordCommand.Password)] = [
                    firstError.Description,
                ],
            }),
            _ => Errors.UnexpectedError(),
        };
    }
}