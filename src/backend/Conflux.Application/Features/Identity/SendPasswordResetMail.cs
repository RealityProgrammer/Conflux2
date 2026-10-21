using Conflux.Application.Services;
using Conflux.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Identity;

public sealed record SendPasswordResetMailCommand : ICommand;

public sealed class SendPasswordResetMailHandler(
    ICurrentUserService currentUserService,
    IAuthMailService authMailService,
    UserManager<ApplicationUser> userManager
) : ICommandHandler<SendPasswordResetMailCommand> {
    public async ValueTask<Unit> Handle(SendPasswordResetMailCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Unit.Value;
        }
        
        ApplicationUser? user = await userManager.FindByIdAsync(userId.ToString());

        if (user == null) {
            return Unit.Value;
        }

        await authMailService.SendPasswordResetEmail(user, cancellationToken);
        return Unit.Value;
    }
}