using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

public class ServerConversationAuthorizeStrategy(
    IServerMemberReadRepository serverMemberReadRepository,
    IConversationRepository conversationRepository
) : IConversationAuthorizeStrategy {
    public ConversationType ConversationType => ConversationType.Server;

    public async Task<bool> CanSendMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        // if user joined the server, allow them to send message
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