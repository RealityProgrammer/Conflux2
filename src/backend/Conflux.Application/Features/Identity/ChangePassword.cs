using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Identity;

public sealed record ChangePasswordCommand(
    string OldPassword,
    string NewPassword
) : ICommand<Result>;

public sealed class ChangePasswordHandler(
    ICurrentUserService currentUserService,
    UserManager<ApplicationUser> userManager
) : ICommandHandler<ChangePasswordCommand, Result> {
    public async ValueTask<Result> Handle(ChangePasswordCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        ApplicationUser? user = await userManager.FindByIdAsync(userId.ToString());

        if (user == null) {
            return Errors.NoUserFoundFromId();
        }
        
        var result = await userManager.ChangePasswordAsync(user, command.OldPassword, command.NewPassword);

        if (result.Succeeded) {
            return Result.Success();
        }

        var firstError = result.Errors.First();
        return firstError.Code switch {
            nameof(IdentityErrorDescriber.PasswordMismatch) => Errors.InvalidCredentials(),
            _ => new(firstError.Code, firstError.Description),
        };
    }
}