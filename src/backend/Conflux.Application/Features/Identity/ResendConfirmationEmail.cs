using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Identity;

public sealed record ResendConfirmationEmailCommand(Guid UserId) : ICommand<Result>;

public sealed class ResendConfirmationEmailHandler(
    UserManager<ApplicationUser> userManager,
    IAuthMailService authMailService
) : ICommandHandler<ResendConfirmationEmailCommand, Result> {
    public async ValueTask<Result> Handle(ResendConfirmationEmailCommand request, CancellationToken cancellationToken) {
        string userId = request.UserId.ToString();
        var user = await userManager.FindByIdAsync(userId);

        if (user == null) {
            return Errors.NoUserFoundFromId();
        }

        if (user.EmailConfirmed) {
            return Errors.UserAlreadyVerified();
        }
        
        return await authMailService.SendConfirmationEmail(user, cancellationToken);
    }
}