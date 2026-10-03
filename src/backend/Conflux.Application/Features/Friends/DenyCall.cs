using Conflux.Application.Features.Conversation;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Friends;

public sealed record DenyCallCommand(Guid CallerId, Guid CalleeId) : ICommand<Result>;

public sealed record CallDeniedNotification(Guid CallerId, Guid CalleeId) : INotification;

internal sealed class DenyCallHandler(
    ICallingService callingService,
    IUserRepository userRepository,
    IDirectConversationProvider directConversationProvider,
    IConversationParticipantsProvider conversationParticipantsProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<DenyCallHandler> logger
) : ICommandHandler<DenyCallCommand, Result> {
    public async ValueTask<Result> Handle(DenyCallCommand command, CancellationToken cancellationToken) {
        Guid callerId = command.CallerId;
        Guid calleeId = command.CalleeId;
        
        var conversationResult = await directConversationProvider.GetOrCreate(callerId, calleeId, CancellationToken.None);

        if (!conversationResult.IsSuccess) {
            return conversationResult.Error;
        }

        Result result = await callingService.DenyCall(callerId, calleeId);

        if (!result.IsSuccess) {
            return result.Error;
        }
        
        await publisher.Publish(new CallDeniedNotification(callerId, calleeId), CancellationToken.None);
        
        // append call denied message to conversation
        Domain.Entities.Conversation conversation = conversationResult.Value!;

        Message message = new() {
            Type = MessageType.Call,
            Properties = new CallProperties(CallEventType.Denied, Duration: null),
            Conversation = conversation,
            SenderUserId = command.CallerId,
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
                    .Where(s => s.Id == command.CallerId)
                    .SelectFacet<TimelineMessageSenderDto>()
                    .FirstOrDefaultAsync(CancellationToken.None),
            };
            
            IReadOnlyCollection<Guid> conversationParticipants = [];

            if (conversation.Type == ConversationType.Direct) {
                conversationParticipants = 
                    await conversationParticipantsProvider.GetDirectConversationParticipantIds(conversation.Id, CancellationToken.None);
            }
            
            await publisher.Publish(
                new MessageReceivedNotification(conversation.Id, conversation.Type, conversationParticipants, messageDto), 
                CancellationToken.None
            );
            
            await publisher.Publish(
                new ConversationUpdatedNotification(conversation.Id, conversationParticipants),
                CancellationToken.None
            );
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while publishing message received event.");
            return Errors.UnexpectedError();
        }

        return Result.Success();
    }
}