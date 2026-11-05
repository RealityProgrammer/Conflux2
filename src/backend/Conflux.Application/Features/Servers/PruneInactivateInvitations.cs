using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Servers;

public sealed class PruneInactivateInvitationsCommand : ICommand;

public sealed class PruneInactivateInvitationsHandler(
    IInvitationRepository invitationRepository,
    TimeProvider timeProvider
) : ICommandHandler<PruneInactivateInvitationsCommand> {
    public async ValueTask<Unit> Handle(
        PruneInactivateInvitationsCommand command, 
        CancellationToken cancellationToken
    ) {
        var utcNow = timeProvider.GetUtcNow();
        var neverUsedInactiveTime = utcNow.Subtract(TimeSpan.FromDays(7));
        var lastUsedInactiveTime = utcNow.Subtract(TimeSpan.FromDays(14));
        
        await invitationRepository
            .AsQueryable()
            .Where(i => 
                // expired
                i.ExpiresAt != null && i.ExpiresAt <= utcNow ||
                
                // maxed out usage
                i.MaxUses != null && i.CurrentUses >= i.MaxUses ||
                
                // permanent invitations that is never used
                i.ExpiresAt == null && i.CurrentUses == 0 && i.CreatedAt <= neverUsedInactiveTime ||
                
                // permanent (but has limit usage) invitations that last used surpassed the active time
                i.ExpiresAt == null && i.MaxUses != null && i.LastUsedAt <= lastUsedInactiveTime
            )
            .ExecuteDeleteAsync(cancellationToken);

        return Unit.Value;
    }
}