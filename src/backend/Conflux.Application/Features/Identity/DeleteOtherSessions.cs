using Conflux.Application.Services;
using Conflux.Domain;

namespace Conflux.Application.Features.Identity;

public sealed record DeleteOtherSessionsCommand : ICommand<Result>;

public sealed class DeleteOtherSessionsHandler(
    ICurrentUserService currentUserService,
    ISessionService sessionService
) : ICommandHandler<DeleteOtherSessionsCommand, Result> {
    public async ValueTask<Result> Handle(DeleteOtherSessionsCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        if (currentUserService.SessionId is not { } sessionId) {
            return Errors.InvalidSession();
        }

        await sessionService.RemoveOtherSessions(userId, sessionId);
        return Result.Success();
    }
}