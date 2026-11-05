using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Users.Notifications;

public sealed record MarkMentionNotificationsAsRead(
    Guid ConversationId
) : ICommand<Result<MentionSource?>>;

public sealed class MarkMentionNotificationsAsReadHandler(
    ICurrentUserService currentUserService,
    INotificationWriteRepository notificationWriteRepository,
    IConversationRepository conversationRepository
) : ICommandHandler<MarkMentionNotificationsAsRead, Result<MentionSource?>> {
    public async ValueTask<Result<MentionSource?>> Handle(
        MarkMentionNotificationsAsRead command, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        var conversationId = command.ConversationId;

        int updateCount = await notificationWriteRepository.MarkMentionsAsReadAsync(
            conversationId, 
            userId, 
            cancellationToken
        );

        if (updateCount == 0) {
            return Result<MentionSource?>.Success(null);
        }

        var mentionSource = await conversationRepository
            .AsQueryable()
            .Where(c => c.Id == conversationId)
            .Select<Domain.Entities.Conversation, MentionSource>(c =>
                c.Type == ConversationType.Direct ? 
                    new MentionFromDm(conversationId, c.FriendRequest!.SenderUserId == userId ? c.FriendRequest.ReceiverUserId : c.FriendRequest.SenderUserId) :
                    c.Type == ConversationType.Server ?
                        new MentionFromServer(conversationId, c.Channel!.CommunityServerId, c.Channel!.Id) :
                        null!
            )
            .FirstOrDefaultAsync(cancellationToken);

        return Result<MentionSource?>.Success(mentionSource);
    }
}