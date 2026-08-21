using Conflux.Application.Dto;
using Conflux.Application.FileFormats;
using Conflux.Application.Notifications;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;

namespace Conflux.Application.Services.Implementations;

internal sealed class MessageService(
    IUnitOfWork unitOfWork,
    IMessageRepository messageRepository,
    IUserRepository userRepository,
    IChannelRepository channelRepository,
    IBlobStorage blobStorage,
    IChannelAuthorizationService channelAuthorizationService,
    IConversationRepository conversationRepository,
    IChannelService channelService,
    IFileFormatInspector fileFormatInspector,
    TimeProvider timeProvider,
    IMediator mediator
) : IMessageService {
    public async Task<Result<GetMessagesResponse>> GetTimelineMessages(
        Guid requesterUserId,
        Guid channelId,
        MessageLoadDirection? direction,
        Guid? cursorMessageId,
        int count,
        CancellationToken cancellationToken = default
    ) {
        Result<ChannelMetadata> getChannelMetadataResult = 
            await channelRepository.GetChannelMetadataFromChannelId(channelId, cancellationToken);
        
        if (!getChannelMetadataResult.IsSuccess) {
            return getChannelMetadataResult.Error;
        }
        
        ChannelMetadata channelMetadata = getChannelMetadataResult.Value!;
        
        Result<MessagingPermissions> authResult = await channelAuthorizationService.GetMessagingPermissions(
            requesterUserId, 
            channelMetadata.ChannelId, 
            channelMetadata.ChannelType
        );

        if (!authResult.IsSuccess) {
            return authResult.Error;
        }

        MessagingPermissions permissions = authResult.Value;

        if (!permissions.HasFlag(MessagingPermissions.ViewMessage)) {
            return Errors.Forbidden("You do not have permission to view this channel.");
        }
        
        Result<PagedTimelineMessageResult> getMessagesResult = await messageRepository.GetTimelineMessages(
            channelMetadata.ConversationId, 
            direction, 
            cursorMessageId,
            count,
            cancellationToken
        );

        if (!getMessagesResult.IsSuccess) {
            return getMessagesResult.Error;
        }
        
        var messagePage = getMessagesResult.Value!;
        
        // bail out early
        if (messagePage.Messages.Count == 0) {
            return Result<GetMessagesResponse>.Success(new([], [], messagePage.HasMoreBefore, messagePage.HasMoreAfter));
        }
        
        // group the messages
        var groups = new List<TimelineMessageBlockDto>();
        TimelineMessageBlockDto? currentGroup = null;

        foreach (TimelineMessageProjection message in getMessagesResult.Value!.Messages) {
            var element = new TimelineMessageDto(
                message.Id, 
                message.Body, 
                message.Attachments, 
                message.CreatedAt,
                message.ReplyTo
            );

            // if same sender as the last message, append to the current group
            if (currentGroup != null && currentGroup.SenderUserId == message.SenderUserId) {
                currentGroup.Messages.Add(element);
            } else {
                // else, create a new group and add it to the list
                currentGroup = new(message.SenderUserId, [element]);
                groups.Add(currentGroup);
            }
        }

        // must have at least 1 user
        List<UserIdentityProfileDto> userProfiles =
            await userRepository.GetIdentityProfiles(
                [..groups
                    .Select(g => g.SenderUserId)
                    .Concat(
                        // include the sender user ids from replying
                        groups
                            .SelectMany(g => g.Messages)
                            .Where(m => m.ReplyTo != null)
                            .Select(m => m.ReplyTo!.SenderUserId)
                        )
                    .Distinct(),
                ],
                cancellationToken
            );
        
        return Result<GetMessagesResponse>.Success(new(
            groups, 
            userProfiles, 
            messagePage.HasMoreBefore, 
            messagePage.HasMoreAfter
        ));
    }
}