using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

internal sealed class DirectConversationAuthorizeStrategy(
    IConversationParticipantRepository conversationParticipantRepository
) : IConversationAuthorizeStrategy {
    public ConversationType ConversationType => ConversationType.Direct;
    
    public async Task<bool> CanSendMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        // only allow participants
        return await conversationParticipantRepository
            .AsQueryable()
            .AnyAsync(c => c.ConversationId == conversationId && c.UserId == userId, cancellationToken);
    }
}