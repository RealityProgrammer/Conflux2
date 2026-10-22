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

        Dictionary<string, string[]> validationErrors = [];

        if (result.Errors.FirstOrDefault(c => c.Code == nameof(IdentityErrorDescriber.PasswordMismatch)) is { } incorrectPasswordError) {
            validationErrors[nameof(ChangePasswordCommand.OldPassword)] = [
                incorrectPasswordError.Description,
            ];
        }

        var passwordErrors = result.Errors.Where(e => e.Code.StartsWith("Password") && e.Code != nameof(IdentityErrorDescriber.PasswordMismatch)).ToList();
        if (passwordErrors.Count > 0) {
            validationErrors.Add(nameof(ChangePasswordCommand.NewPassword), [.. passwordErrors.Select(e => e.Description)]);
        }

        if (validationErrors.Count > 0) {
            return Errors.ValidationErrorsOccurred(validationErrors);
        }
        
        var firstError = result.Errors.First();
        return new Error(firstError.Code, firstError.Description);
    }
}