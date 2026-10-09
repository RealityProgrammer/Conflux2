using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

public class ServerConversationAuthorizeStrategy(
    IServerMemberReadRepository serverMemberReadRepository,
    IConversationRepository conversationRepository,
    IServerPermissionsProvider serverPermissionsProvider
) : IConversationAuthorizeStrategy {
    public ConversationType ConversationType => ConversationType.Server;

    public async Task<bool> CanReadMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        if (await GetServerId(userId, conversationId, cancellationToken) is not { } serverId) {
            return false;
        }
        
        // TODO: per-channel access control.
        return true;
    }

    public async Task<bool> CanSendMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        if (await GetServerId(userId, conversationId, cancellationToken) is not { } serverId) {
            return false;
        }

        var permissions = 
            await serverPermissionsProvider.GetUserAuthorizeInfo(serverId, userId, cancellationToken);

        return permissions.IsSuccess && permissions.Value!.EffectivePermissions.Contains(ServerPermission.SendMessage);
    }

    public async Task<bool> CanEditMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        if (await GetServerId(userId, conversationId, cancellationToken) is not { } serverId) {
            return false;
        }

        var permissions = 
            await serverPermissionsProvider.GetUserAuthorizeInfo(serverId, userId, cancellationToken);

        return permissions.IsSuccess && permissions.Value!.EffectivePermissions.Contains(ServerPermission.EditMessages);
    }

    public async Task<bool> CanDeleteMessage(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        if (await GetServerId(userId, conversationId, cancellationToken) is not { } serverId) {
            return false;
        }

        var permissions = 
            await serverPermissionsProvider.GetUserAuthorizeInfo(serverId, userId, cancellationToken);

        return permissions.IsSuccess && permissions.Value!.EffectivePermissions.Contains(ServerPermission.DeleteMessages);
    }

    private async Task<Guid?> GetServerId(Guid userId, Guid conversationId, CancellationToken cancellationToken = default) {
        return await conversationRepository
            .AsQueryable()
            .Where(c => c.Id == conversationId && c.Type == ConversationType.Server && c.Channel != null)
            .Where(c => serverMemberReadRepository.AsQueryable().Any(m =>
                m.CommunityServerId == c.Channel!.CommunityServerId &&
                m.UserId == userId &&
                m.Status == MembershipStatus.Active
            ))
            .Select(c => c.Channel!.CommunityServerId)
            .Cast<Guid?>()
            .FirstOrDefaultAsync(cancellationToken);
    }
}