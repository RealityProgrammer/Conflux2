using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

internal sealed class DirectConversationAuthorizeStrategy(
    IConversationParticipantRepository conversationParticipantRepository
) : IConversationAuthorizeStrategy {
    public ConversationType ConversationType => ConversationType.Direct;

    public async Task<bool> CanReadMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        // only allow participants
        return await IsConversationParticipant(userId, conversationId, cancellationToken);
    }

    public async Task<bool> CanSendMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        // only allow participants
        return await IsConversationParticipant(userId, conversationId, cancellationToken);
    }

    public async Task<bool> CanEditMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        // only allow participants
        return await IsConversationParticipant(userId, conversationId, cancellationToken);
    }

    public async Task<bool> CanDeleteMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        // only allow participants
        return await IsConversationParticipant(userId, conversationId, cancellationToken);
    }

    private async Task<bool> IsConversationParticipant(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        return await conversationParticipantRepository
            .AsQueryable()
            .AnyAsync(c => c.ConversationId == conversationId && c.UserId == userId, cancellationToken);

    }
}