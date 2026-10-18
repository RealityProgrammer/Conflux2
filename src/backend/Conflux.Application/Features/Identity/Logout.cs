using Conflux.Application.Services;

namespace Conflux.Application.Features.Identity;

public sealed record LogoutCommand(Guid UserId, Guid SessionId) : ICommand;

public sealed class LogoutHandler(
    ISessionService sessionService
) : ICommandHandler<LogoutCommand> {
    public async ValueTask<Unit> Handle(LogoutCommand command, CancellationToken cancellationToken) {
        await sessionService.RemoveSession(command.UserId, command.SessionId);
        return Unit.Value;
    }
}