using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class MessagingRepository(
    ApplicationDbContext dbContext,
    TimeProvider timeProvider
) : IMessagingRepository {
    public async Task<Result<Message>> CreateMessageAsync(
        Guid senderUserId, 
        Guid conversationId,
        string? body, 
        Guid[] attachmentIds, 
        CancellationToken cancellationToken = default
    ) {
        Message message = new() {
            Body = body,
            AttachmentIds = attachmentIds,
            SenderUserId = senderUserId,
            ConversationId = conversationId,
            CreatedAt = timeProvider.GetUtcNow(),
        };

        dbContext.Add(message);
        
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<Message>.Success(message);
    }
}