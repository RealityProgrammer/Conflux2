using Conflux.Application.Extensions;
using Conflux.Application.Services;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed class PruneDeletedMessagesCommand : ICommand;

public sealed class PruneDeletedMessagesHandler(
    IMessageRepository messageRepository,
    TimeProvider timeProvider,
    IMessageMediaService messageMediaService
) : ICommandHandler<PruneDeletedMessagesCommand> {
    private static readonly TimeSpan DeleteRemovalDuration = TimeSpan.FromDays(28);
    
    public async ValueTask<Unit> Handle(PruneDeletedMessagesCommand command, CancellationToken cancellationToken) {
        var utcNow = timeProvider.GetUtcNow();

        var searchQuery = messageRepository
            .AsQueryable()
            .IncludeDeletedMessages()
            .Where(m => m.DeletedAt != null && m.DeletedAt + DeleteRemovalDuration <= utcNow);

        List<Guid> deletingAttachmentIds = await searchQuery
            .SelectMany(m => m.Attachments)
            .Select(a => a.Id)
            .ToListAsync(cancellationToken);

        await messageMediaService.DeleteAttachments(deletingAttachmentIds, cancellationToken);

        await searchQuery
            .ExecuteDeleteAsync(cancellationToken);
        
        return Unit.Value;
    }
}