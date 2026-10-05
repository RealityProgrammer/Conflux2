using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record CancelCallCommand(Guid CallerId, Guid CalleeId) : ICommand<Result<TimelineMessageDto>>;

public sealed record CallCanceledNotification(Guid CallerId, Guid CalleeId) : INotification;

internal sealed class CancelCallHandler(
    ICallingService callingService,
    IUserRepository userRepository,
    IDirectConversationProvider directConversationProvider,
    IConversationParticipantsProvider conversationParticipantsProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<CancelCallHandler> logger
) : ICommandHandler<CancelCallCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(CancelCallCommand command, CancellationToken cancellationToken) {
        Guid callerId = command.CallerId;
        Guid calleeId = command.CalleeId;
        
        var conversationResult = await directConversationProvider.GetOrCreate(callerId, calleeId, cancellationToken);

        if (!conversationResult.IsSuccess) {
            return conversationResult.Error;
        }

        Domain.Entities.Conversation conversation = conversationResult.Value!;
        
        Result result = await callingService.CancelCall(callerId, calleeId);
        
        if (!result.IsSuccess) {
            return result.Error;
        }
        
        await publisher.Publish(new CallCanceledNotification(callerId, calleeId), CancellationToken.None);
        
        // append call canceled message to conversation
        Message message = new() {
            Type = MessageType.Call,
            Properties = new CallProperties(CallEventType.Canceled, Duration: null),
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