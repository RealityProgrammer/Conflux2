using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed class PruneDeletedMessagesCommand : ICommand;

public sealed class PruneDeletedMessagesHandler(
    IMessageRepository messageRepository,
    TimeProvider timeProvider
) : ICommandHandler<PruneDeletedMessagesCommand> {
    private static readonly TimeSpan DeleteRemovalDuration = TimeSpan.FromDays(28);
    
    public async ValueTask<Unit> Handle(PruneDeletedMessagesCommand command, CancellationToken cancellationToken) {
        var utcNow = timeProvider.GetUtcNow();

        await messageRepository
            .AsQueryable()
            .Where(m => m.DeletedAt != null && m.DeletedAt + DeleteRemovalDuration <= utcNow)
            .ExecuteDeleteAsync(cancellationToken);
        
        return Unit.Value;
    }
}