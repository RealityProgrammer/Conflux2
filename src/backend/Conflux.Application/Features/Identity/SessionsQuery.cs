using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;

namespace Conflux.Application.Features.Identity;

public sealed record SessionsQueryResult(SessionDetails CurrentSession, List<SessionDetails> AllSessions);

public sealed record SessionsQuery : IQuery<Result<SessionsQueryResult>>;

public sealed class SessionsQueryHandler(
    ICurrentUserService currentUserService,
    ISessionService sessionService
) : IQueryHandler<SessionsQuery, Result<SessionsQueryResult>> {
    public async ValueTask<Result<SessionsQueryResult>> Handle(
        SessionsQuery query, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        if (currentUserService.SessionId is not { } sessionId) {
            return Errors.InvalidSession();
        }

        var currentSession = await sessionService.GetSession(userId, sessionId);

        if (currentSession == null) {
            return Errors.InvalidSession();
        }
        
        var allSessions = await sessionService.GetSessions(userId);
        
        return Result<SessionsQueryResult>.Success(new(currentSession, allSessions));
    }
}