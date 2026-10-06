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
    Guid CallerId,
    string CallerConnectionId,
    Guid CalleeId
) : ICommand<Result<StartCallResult>>;

public sealed record IncomingCallNotification(Guid CallId, Guid CalleeId, UserIdentityProfileDto CallerProfile) : INotification;

internal sealed class StartDirectCallHandler(
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
        Guid callerId = command.CallerId;
        Guid calleeId = command.CalleeId;
        
        var conversationResult = await directConversationProvider.GetOrCreate(callerId, calleeId, cancellationToken);

        if (!conversationResult.IsSuccess) {
            return conversationResult.Error;
        }

        Domain.Entities.Conversation conversation = conversationResult.Value!;
        
        Result<Guid> callIdResult = await callingService.InitializeDirectCall(callerId, command.CallerConnectionId, calleeId);
        
        if (!callIdResult.IsSuccess) {
            return callIdResult.Error;
        }

        Guid callId = callIdResult.Value;

        try {
            var profiles = await friendRequestRepository.AsQueryable()
                .Where(r => r.Status == FriendRequestStatus.Accepted)
                .Where(r =>
                    r.SenderUserId == command.CallerId && r.ReceiverUserId == command.CalleeId ||
                    r.SenderUserId == command.CalleeId && r.ReceiverUserId == command.CallerId
                )
                .Include(r => r.Sender)
                .Include(r => r.Receiver)
                .Select(r => new {
                    Sender = new UserIdentityProfileDto {
                        Id = r.Sender.Id,
                        UserName = r.Sender.UserName,
                        DisplayName = r.Sender.DisplayName,
                        AvatarRevision = r.Sender.AvatarRevision,
                    },
                    Receiver = new UserIdentityProfileDto {
                        Id = r.Receiver.Id,
                        UserName = r.Receiver.UserName,
                        DisplayName = r.Receiver.DisplayName,
                        AvatarRevision = r.Receiver.AvatarRevision,
                    },
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (profiles == null) {
                await callingService.LeaveOrEndCall(callId, callerId);
                return Errors.NoAcceptedFriendRequest();
            }
            
            UserIdentityProfileDto callerProfile = profiles.Sender.Id == command.CallerId ? profiles.Sender : profiles.Receiver;
            UserIdentityProfileDto calleeProfile = profiles.Sender.Id == command.CallerId ? profiles.Receiver : profiles.Sender;
            
            await publisher.Publish(new IncomingCallNotification(callId, calleeProfile.Id, callerProfile), CancellationToken.None);
            
            // append the start call message to conversation
            Message createdMessage = new Message {
                Type = MessageType.Call,
                Properties = new CallProperties(CallEventType.Start, Duration: null),
                Conversation = conversation,
                SenderUserId = command.CallerId,
            };
            
            conversation.Messages.Add(createdMessage);

            await unitOfWork.SaveChangesAsync(cancellationToken);
            
            TimelineMessageDto messageDto = new(createdMessage) {
                Sender = await userRepository
                    .AsQueryable()
                    .Where(s => s.Id == command.CallerId)
                    .SelectFacet<TimelineMessageSenderDto>()
                    .FirstOrDefaultAsync(CancellationToken.None),
            };

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
            await callingService.LeaveOrEndCall(callId, callerId);
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while starting direct call.");
            
            await callingService.LeaveOrEndCall(callId, callerId);
            return Errors.UnexpectedError();
        }
    }
}