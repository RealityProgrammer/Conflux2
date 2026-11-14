using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record StartDirectCallCommand(
    string CallerConnectionId,
    Guid CalleeId
) : ICommand<Result<StartCallResult>>;

public sealed record IncomingCallNotification(Guid CallId, Guid CalleeId, UserIdentityProfileDto CallerProfile) : INotification;

internal sealed class StartDirectCallHandler(
    ICurrentUserService currentUserService,
    ICallingService callingService,
    IUserRepository userRepository,
    IFriendRequestRepository friendRequestRepository,
    IDirectConversationProvider directConversationProvider,
    IConversationParticipantsProvider conversationParticipantsProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<StartDirectCallHandler> logger
) : ICommandHandler<StartDirectCallCommand, Result<StartCallResult>> {
    public async ValueTask<Result<StartCallResult>> Handle(
        StartDirectCallCommand command, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } callerId) {
            return Errors.InvalidIdentifier();
        }
        
        Guid calleeId = command.CalleeId;
        
        var conversationResult = await directConversationProvider.GetOrCreate(callerId, calleeId, cancellationToken);

        if (!conversationResult.IsSuccess) {
            return conversationResult.Error;
        }
        
        // get profiles
        var profiles = await friendRequestRepository.AsQueryable()
            .Where(r => r.Status == FriendRequestStatus.Accepted)
            .Where(r =>
                r.SenderUserId == callerId && r.ReceiverUserId == calleeId ||
                r.SenderUserId == calleeId && r.ReceiverUserId == callerId
            )
            .Include(r => r.Sender)
            .Include(r => r.Receiver)
            .Select(r => new {
                Sender = new UserIdentityProfileDto {
                    Id = r.Sender.Id,
                    UserName = r.Sender.UserName,
                    DisplayName = r.Sender.DisplayName,
                    AvatarVersion = r.Sender.AvatarVersion,
                },
                Receiver = new UserIdentityProfileDto {
                    Id = r.Receiver.Id,
                    UserName = r.Receiver.UserName,
                    DisplayName = r.Receiver.DisplayName,
                    AvatarVersion = r.Receiver.AvatarVersion,
                },
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (profiles == null) {
            return Errors.NoAcceptedFriendRequest();
        }

        Domain.Entities.Conversation conversation = conversationResult.Value!;
        
        Result<Guid> callIdResult = await callingService.InitializeDirectCall(callerId, command.CallerConnectionId, calleeId);
        
        if (!callIdResult.IsSuccess) {
            return callIdResult.Error;
        }

        Guid callId = callIdResult.Value;

        try {
            UserIdentityProfileDto callerProfile = profiles.Sender.Id == callerId ? profiles.Sender : profiles.Receiver;
            UserIdentityProfileDto calleeProfile = profiles.Sender.Id == callerId ? profiles.Receiver : profiles.Sender;
            
            await publisher.Publish(new IncomingCallNotification(callId, calleeProfile.Id, callerProfile), CancellationToken.None);
            
            // append the start call message to conversation
            Message message = new Message {
                Type = MessageType.CallStart,
                Conversation = conversation,
                SenderUserId = callerId,
            };
            
            conversation.Messages.Add(message);

            await unitOfWork.SaveChangesAsync(cancellationToken);
            
            TimelineMessageDto messageDto = new(
                message.Id,
                message.Type,
                await userRepository
                    .AsQueryable()
                    .Where(s => s.Id == message.SenderUserId)
                    .Select(u => new TimelineMessageSenderDto(u.Id, u.DisplayName, u.AvatarVersion))
                    .FirstOrDefaultAsync(CancellationToken.None),
                null,
                null,
                null,
                null,
                message.CreatedAt,
                null,
                message.ConversationId,
                false,
                null,
                null
            );

            await publisher.Publish(
                new MessageReceivedNotification(conversation.Id, messageDto), 
                CancellationToken.None
            );

            if (conversation.Type == ConversationType.Direct) {
                var conversationParticipants =
                    await conversationParticipantsProvider.GetDirectConversationParticipantIds(conversation.Id, CancellationToken.None);

                await publisher.Publish(
                    new DirectConversationUpdatedNotification(conversation.Id, conversationParticipants),
                    CancellationToken.None
                );
            }

            return Result<StartCallResult>.Success(new(callId, calleeProfile, messageDto));
        } catch (OperationCanceledException) {
            await callingService.DeleteDirectCall(callId);
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while starting direct call.");
            
            await callingService.DeleteDirectCall(callId);
            return Errors.UnexpectedError();
        }
    }
}