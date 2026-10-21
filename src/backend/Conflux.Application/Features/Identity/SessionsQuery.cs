using Conflux.Application.Services;

namespace Conflux.Application.Features.Identity;

public sealed record SessionsQuery : IQuery<List<string>>;

public sealed class SessionsQueryHandler(
    ICurrentUserService currentUserService,
    ISessionService sessionService
) : IQueryHandler<SessionsQuery, List<string>> {
    public async ValueTask<List<string>> Handle(SessionsQuery query, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } userId) {
            return [];
        }

        return await sessionService.GetSessions(userId);
    }
}