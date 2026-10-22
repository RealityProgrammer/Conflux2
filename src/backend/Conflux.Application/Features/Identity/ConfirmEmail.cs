using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

namespace Conflux.Application.Features.Identity;

public sealed record ConfirmEmailCommand(string Email, string ConfirmationCode) : ICommand<Result>;

public sealed class ConfirmEmailHandler(
    UserManager<ApplicationUser> userManager
) : ICommandHandler<ConfirmEmailCommand, Result> {
    public async ValueTask<Result> Handle(ConfirmEmailCommand request, CancellationToken cancellationToken) {
        var user = await userManager.FindByEmailAsync(request.Email);

        if (user == null) {
            return Errors.NoUserFoundFromEmail();
        }

        if (user.EmailConfirmed) {
            return Errors.UserAlreadyVerified();
        }
        
        var decodedToken = Base64UrlEncoder.DecodeBytes(request.ConfirmationCode);
        var code = Encoding.UTF8.GetString(decodedToken);
        IdentityResult result = await userManager.ConfirmEmailAsync(user, code);
        
        if (result.Succeeded) {
            return Result.Success();
        }

        var firstError = result.Errors.First();
        return Result.Failure(firstError.Code, firstError.Description);
    }
}