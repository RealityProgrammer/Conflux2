using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Identity;

public sealed record ConfirmEmailCommand(string UserId, string ConfirmationCode) : ICommand<Result>;

public sealed class ConfirmEmailHandler(
    UserManager<ApplicationUser> userManager
) : ICommandHandler<ConfirmEmailCommand, Result> {
    public async ValueTask<Result> Handle(ConfirmEmailCommand request, CancellationToken cancellationToken) {
        var user = await userManager.FindByIdAsync(request.UserId);

        if (user == null) {
            return Errors.NoUserFoundFromId();
        }

        if (user.EmailConfirmed) {
            return Errors.UserAlreadyVerified();
        }
        
        IdentityResult result = await userManager.ConfirmEmailAsync(user, request.ConfirmationCode);
        
        if (result.Succeeded) {
            return Result.Success();
        }

        var firstError = result.Errors.First();
        return Result.Failure(firstError.Code, firstError.Description);
    }
}