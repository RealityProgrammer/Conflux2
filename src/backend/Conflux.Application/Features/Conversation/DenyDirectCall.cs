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

public sealed record DenyCallCommand(Guid CallId, Guid CalleeId) : ICommand<Result<TimelineMessageDto>>;

public sealed record CallDeniedNotification(Guid CallId, Guid CallerId, Guid CalleeId) : INotification;

internal sealed class DenyCallHandler(
    ICallingService callingService,
    IUserRepository userRepository,
    IDirectConversationProvider directConversationProvider,
    IConversationParticipantsProvider conversationParticipantsProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<DenyCallHandler> logger
) : ICommandHandler<DenyCallCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(DenyCallCommand command, CancellationToken cancellationToken) {
        // reject call first
        Guid calleeId = command.CalleeId;
        
        Result<RejectDirectCallResult> result = await callingService.RejectDirectCall(command.CallId, calleeId);
        
        if (!result.IsSuccess) {
            return result.Error;
        }

        Guid callerId = result.Value!.CallerId;
        await publisher.Publish(new CallDeniedNotification(result.Value!.CallId, callerId, calleeId), CancellationToken.None);

        var conversationResult = await directConversationProvider.GetOrCreate(callerId, calleeId, cancellationToken);
        
        if (!conversationResult.IsSuccess) {
            return conversationResult.Error;
        }
        
        Domain.Entities.Conversation conversation = conversationResult.Value!;

        // append call denied message to conversation
        Message message = new() {
            Type = MessageType.Call,
            Properties = new CallProperties(CallEventType.Denied, Duration: null),
            Conversation = conversation,
            SenderUserId = calleeId,
        };
        
        conversation.Messages.Add(message);
        
        try {
            await unitOfWork.SaveChangesAsync(CancellationToken.None);
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while saving call denied message.");
            return Errors.UnexpectedError();
        }
        
        try {
            TimelineMessageDto messageDto = new(message) {
                Sender = await userRepository
                    .AsQueryable()
                    .Where(s => s.Id == calleeId)
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