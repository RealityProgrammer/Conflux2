using Conflux.Application.Dto;
using Conflux.Application.Features.Messages;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Friends;

public sealed record StartCallCommand(
    Guid CallerId, 
    string CallerConnectionId, 
    Guid CalleeId
) : ICommand<Result<UserIdentityProfileDto>>;

public sealed record IncomingCallNotification(Guid CalleeId, UserIdentityProfileDto CallerProfile) : INotification;

internal sealed class StartCallHandler(
    ICallingService callingService,
    IUserRepository userRepository,
    IFriendRequestRepository friendRequestRepository,
    IDirectConversationProvider directConversationProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<StartCallHandler> logger
) : ICommandHandler<StartCallCommand, Result<UserIdentityProfileDto>> {
    public async ValueTask<Result<UserIdentityProfileDto>> Handle(
        StartCallCommand command, 
        CancellationToken cancellationToken
    ) {
        Result lockResult = await callingService.LockCallerAndCallee(command.CallerId, command.CallerConnectionId, command.CalleeId);

        if (!lockResult.IsSuccess) {
            return lockResult.Error;
        }

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
                await callingService.UnlockCallerAndCallee(command.CallerId, command.CalleeId);
                return Errors.NoAcceptedFriendRequest();
            }

            // append the start call message to conversation
            var conversationResult = await directConversationProvider.GetOrCreate(command.CallerId, command.CalleeId, cancellationToken);

            if (!conversationResult.IsSuccess) {
                await callingService.UnlockCallerAndCallee(command.CallerId, command.CalleeId);
                return conversationResult.Error;
            }

            Conversation directConversation = conversationResult.Value!;

            Message createdMessage = new Message {
                Type = MessageType.Call,
                Properties = new CallProperties(CallEventType.Start, Duration: null),
                Conversation = directConversation,
                SenderUserId = command.CallerId,
            };
            
            directConversation.Messages.Add(createdMessage);

            await unitOfWork.SaveChangesAsync(cancellationToken);
            
            UserIdentityProfileDto callerProfile = profiles.Sender.Id == command.CallerId ? profiles.Sender : profiles.Receiver;
            UserIdentityProfileDto calleeProfile = profiles.Sender.Id == command.CallerId ? profiles.Receiver : profiles.Sender;

            await publisher.Publish(new IncomingCallNotification(calleeProfile.Id, callerProfile), CancellationToken.None);

            TimelineMessageDto messageDto = new(createdMessage) {
                Sender = await userRepository
                    .AsQueryable()
                    .Where(s => s.Id == command.CallerId)
                    .SelectFacet<TimelineMessageSenderDto>()
                    .FirstOrDefaultAsync(CancellationToken.None),
            };

            await publisher.Publish(new MessageReceivedNotification(directConversation.Id, messageDto), CancellationToken.None);
            
            return Result<UserIdentityProfileDto>.Success(calleeProfile);
        } catch (OperationCanceledException) {
            await callingService.UnlockCallerAndCallee(command.CallerId, command.CalleeId);
            throw;
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while starting direct call.");
            
            await callingService.UnlockCallerAndCallee(command.CallerId, command.CalleeId);
            return Errors.UnexpectedError();
        }
    }
}