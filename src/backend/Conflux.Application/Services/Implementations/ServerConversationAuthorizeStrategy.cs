using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

public class ServerConversationAuthorizeStrategy(
    IServerMemberReadRepository serverMemberReadRepository,
    IConversationRepository conversationRepository
) : IConversationAuthorizeStrategy {
    public ConversationType ConversationType => ConversationType.Server;

    public async Task<bool> CanReadMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        return await HasActiveServerMembership(userId, conversationId, cancellationToken);
    }

    public async Task<bool> CanSendMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        return await HasActiveServerMembership(userId, conversationId, cancellationToken);
    }

    public async Task<bool> CanEditMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        return await HasActiveServerMembership(userId, conversationId, cancellationToken);
    }

    public async Task<bool> CanDeleteMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        return await HasActiveServerMembership(userId, conversationId, cancellationToken);
    }

    private async Task<bool> HasActiveServerMembership(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        return await conversationRepository
            .AsQueryable()
            .Where(c => c.Id == conversationId && c.Channel != null)
            .AnyAsync(c => serverMemberReadRepository.AsQueryable().Any(m =>
                m.CommunityServerId == c.Channel!.CommunityServerId &&
                m.UserId == userId &&
                m.Status == MembershipStatus.Active
            ), cancellationToken);
        
    }
}