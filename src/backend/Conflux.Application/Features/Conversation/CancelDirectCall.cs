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

public sealed record CancelDirectCallCommand(Guid CallId, Guid CallerId) : ICommand<Result<TimelineMessageDto>>;

public sealed record DirectCallCanceledNotification(Guid CallId, Guid CallerId, Guid CalleeId) : INotification;

internal sealed class CancelDirectCallHandler(
    ICallingService callingService,
    IUserRepository userRepository,
    IDirectConversationProvider directConversationProvider,
    IConversationParticipantsProvider conversationParticipantsProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<CancelDirectCallHandler> logger
) : ICommandHandler<CancelDirectCallCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(CancelDirectCallCommand command, CancellationToken cancellationToken) {
        // cancel call first.
        Guid callerId = command.CallerId;
        
        Result<CancelDirectCallResult> result = await callingService.CancelDirectCall(command.CallId, command.CallerId);
        
        if (!result.IsSuccess) {
            return result.Error;
        }

        Guid calleeId = result.Value!.CalleeId;
        await publisher.Publish(new DirectCallCanceledNotification(command.CallId, callerId, calleeId), CancellationToken.None);
        
        var conversationResult = await directConversationProvider.GetOrCreate(callerId, calleeId, cancellationToken);
        
        if (!conversationResult.IsSuccess) {
            return conversationResult.Error;
        }
        
        Domain.Entities.Conversation conversation = conversationResult.Value!;
        
        // append call canceled message to conversation
        Message message = new() {
            Type = MessageType.CallCancel,
            Conversation = conversation,
            SenderUserId = callerId,
        };
        
        conversation.Messages.Add(message);
        
        try {
            await unitOfWork.SaveChangesAsync(CancellationToken.None);
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while saving call cancelled message.");
            return Errors.UnexpectedError();
        }
        
        try {
            TimelineMessageDto messageDto = new(message) {
                Sender = await userRepository
                    .AsQueryable()
                    .Where(s => s.Id == callerId)
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
            
            return Result<TimelineMessageDto>.Success(messageDto);
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while publishing message received event.");
            return Errors.UnexpectedError();
        }
    }
}