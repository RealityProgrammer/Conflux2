using Conflux.Application.Services;
using Conflux.Domain;

namespace Conflux.Application.Features.Identity;

public sealed record DeleteSessionCommand(Guid SessionId) : ICommand<Result>;

public sealed class DeleteSessionHandler(
    ICurrentUserService currentUserService,
    ISessionService sessionService
) : ICommandHandler<DeleteSessionCommand, Result> {
    public async ValueTask<Result> Handle(DeleteSessionCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        bool removed = await sessionService.RemoveSession(userId, command.SessionId);
        return removed ? Result.Success() : Errors.SessionNotFound(command.SessionId);
    }
}