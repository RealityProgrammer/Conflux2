using Conflux.Application.Services;

namespace Conflux.Application.Features.Identity;

public sealed record LogoutAllCommand(Guid UserId) : ICommand;

public sealed class LogoutAllHandler(
    ISessionService sessionService
) : ICommandHandler<LogoutAllCommand> {
    public async ValueTask<Unit> Handle(LogoutAllCommand command, CancellationToken cancellationToken) {
        await sessionService.RemoveAllSession(command.UserId);
        return Unit.Value;
    }
}