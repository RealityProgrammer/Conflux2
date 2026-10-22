using Conflux.Application.Services;
using Conflux.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Identity;

public sealed record SendPasswordResetMailCommand(string Email) : ICommand;

public sealed class SendPasswordResetMailHandler(
    IAuthMailService authMailService,
    UserManager<ApplicationUser> userManager
) : ICommandHandler<SendPasswordResetMailCommand> {
    public async ValueTask<Unit> Handle(SendPasswordResetMailCommand command, CancellationToken cancellationToken) {
        ApplicationUser? user = await userManager.FindByEmailAsync(command.Email);

        if (user == null) {
            return Unit.Value;
        }

        await authMailService.SendPasswordResetEmail(user, cancellationToken);
        return Unit.Value;
    }
}